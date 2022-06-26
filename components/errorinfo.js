import {WebpackModules, Utilities} from "https://strencher.github.io/libkernel/libkernel.js";

let React = Utilities.makeLazy(() => WebpackModules.getByProps("useState", "createElement"));

export default function ErrorInfo({error, info, stack}) {
    return React.createElement(
        "div",
        {
            className: "crash-recovery-container"
        },
        React.createElement(
            "div",
            {
                className: "crash-recovery-invariant"
            },
            info
        ),
    )
}
