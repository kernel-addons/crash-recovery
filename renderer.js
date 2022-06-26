import {Utilities, monkeyPatch, WebpackModules, TreeSearcher} from "https://strencher.github.io/libkernel/libkernel.js";
import ErrorInfo from "./components/errorinfo";

const codes = await fetch("https://raw.githubusercontent.com/facebook/react/master/scripts/error-codes/codes.json").then(r => r.json());
const parseInvariant = (link) => {
    const params = new URL(link).searchParams;

    const code = params.get("invariant");
    const args = params.get("args[]");

    return codes[code] ? codes[code].replace("%s", args) : null;
};

export default new class CrashRecovery {
    patches = null;
    
    async start() {
        window.CrashRecovery.loadCSS();
        await WebpackModules;

        const React = WebpackModules.getByProps("useState", "createElement");
        const {URL_REGEX} = WebpackModules.getByProps("URL_REGEX");
        const ErrorBoundary = WebpackModules.getByDisplayName("ErrorBoundary");
        const ContextMenuActions = WebpackModules.getByProps("closeContextMenu");
        const ModalActions = WebpackModules.getByProps("closeModal", "useModalsStore");
        const Button = WebpackModules.getByProps("BorderColors", "Colors");
        const NavigationUtils = WebpackModules.getByProps("transitionTo");
        const ModalStack = Utilities.makeLazy(() => WebpackModules.getByProps("pop", "push", "popAll"));
        const LayerManager = Utilities.makeLazy(() => WebpackModules.getByProps("popAllLayers"));
        const ToastActions = Utilities.makeLazy(() => WebpackModules.getByProps("useToastStore"));
        
        this.unpatches = monkeyPatch(ErrorBoundary.prototype, {
            render(patch) {
                if (!this.state.error || !this.state.info) return;

                patch.preventDefault();
                const result = patch.callOriginal();

                const buttons = new TreeSearcher(result)
                    .walk("props", "action", "props").value();

                if (Array.isArray(buttons?.children)) {
                    buttons.className += " crash-recovery-buttons";

                    buttons.children.push(
                        React.createElement(
                            Button,
                            {
                                size: Button.Sizes.LARGE,
                                onClick: () => {
                                    this.tryAgain();
                                }
                            },
                            "Recover"
                        ),
                        React.createElement(
                            Button,
                            {
                                size: Button.Sizes.LARGE,
                                color: Button.Colors.YELLOW,
                                onClick: () => {
                                    NavigationUtils.transitionTo("/channels/@me");
                                }
                            },
                            "Go into Home screen"
                        )
                    );
                }

                if (result?.props?.note) {
                    result.props.note = React.createElement(
                        ErrorInfo,
                        this.state
                    );
                }

                patch.return(result);
            },

            componentDidCatch(patch) {
                patch.preventDefault();
                const [error, additionalInfo] = patch.methodArguments;
                const url = error.stack.match(URL_REGEX)[0];
                const invariant = parseInvariant(url) ?? error.message;
    
                const errorObj = Object.assign(new Error(), {
                    stack: `React Uncaught Error: ${invariant}${additionalInfo.componentStack}`
                });
    
                console.error(errorObj);
    
                this.setState({
                    error,
                    info: invariant,
                    stack: additionalInfo.componentStack
                });
            },

            tryAgain() {
                const failed = [];
    
                try {
                    ToastActions.useToastStore.setState({currentToast: null, queuedToasts: []});
                } catch (error) {
                    failed.push("clearing Toasts");
                    console.error(error);
                }
    
                try {
                    ContextMenuActions.closeContextMenu();
                } catch (error) {
                    failed.push("closing ContextMenus");
                    console.error(error);
                }
    
                try {
                    ModalStack.popAll();
                } catch (error) {
                    failed.push("clearing ModalStack");
                    console.error(error);
                }
    
                try {
                    LayerManager.popAllLayers();
                } catch (error) {
                    failed.push("clearing LayerManager");
                    console.error(error);
                }
    
                try {
                    ModalActions.useModalsStore.setState({default: []});
                } catch (error) {
                    failed.push("clearing ModalsApi");
                    console.error(error);
                }
    
                if (failed.length) {
                    const plural = failed.length > 1;
                    console.error(`The following action${plural ? "s" : ""} ${plural ? "have" : "has"} failed to be executed: ${failed.join(", ")}`);
                }
    
                this.setState({error: null, info: null, stack: null});
            }
        });
    }

    stop() {
        this.patches?.forEach(p => p());
    }
}
