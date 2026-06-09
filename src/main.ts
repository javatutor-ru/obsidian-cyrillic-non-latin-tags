import { Plugin } from "obsidian";
import { Range } from "@codemirror/state";
import {
    ViewPlugin,
    DecorationSet,
    Decoration,
    ViewUpdate,
    EditorView
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";


// Inject CSS styles. Remove the influence of the <span> parent so that the wrapper does not alter the font properties of the tag text
const tagThemeExtension = EditorView.theme({
    ".cm-hashtag:has(.cm-tag-non-latin)": {
        display: "contents !important",
        fontSize: "inherit !important",
        lineHeight: "inherit !important",
        fontFamily: "inherit !important",
        fontWeight: "inherit !important"
    }
});

// Export the class for isolated testing
export class CyrillicNonLatinTags {
    decorations: DecorationSet;

    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    isNonLatinTag(tagText: string): boolean {

        // RegExp optimized for ESLint.
        // 1. Ensures the character is not an ASCII letter [A-Za-z].
        // 2. Checks if the remaining character is a Unicode letter (\p{L}).
        return /(?![A-Za-z])\p{L}/u.test(tagText);

    }

    buildDecorations(view: EditorView): DecorationSet {
        const builder: Range<Decoration>[] = [];

        for (const { from, to } of view.visibleRanges) {
            let tagStartFrom: number | null = null;
            let currentTagNodes: { from: number; to: number }[] = [];

            syntaxTree(view.state).iterate({
                from,
                to,
                enter: (node) => {
                    const nodeName = node.name;

                    // Tag start condition
                    if (nodeName.includes("hashtag-begin")) {
                        tagStartFrom = node.from;
                        currentTagNodes = [];
                    }

                    // Collect all component parts (span nodes) of the tag
                    if (tagStartFrom !== null) {
                        currentTagNodes.push({ from: node.from, to: node.to });
                    }

                    // Tag end condition
                    if (nodeName.includes("hashtag-end") && tagStartFrom !== null) {
                        // Tag text excluding the hash symbol #
                        let tagText = view.state.doc.sliceString(tagStartFrom + 1, node.to);

                        if (this.isNonLatinTag(tagText)) {

                            // Remove all slashes from the class name
                            tagText = tagText.replaceAll("/", "");

                            const dynamicClassName = `cm-tag-${tagText}`;

                            // Create dynamic decorations for the start, middle, and end of the tag
                            const dynamicBegin = Decoration.mark({
                                attributes: { class: `cm-hashtag cm-hashtag-begin cm-tag-non-latin ${dynamicClassName}` }
                            });
                            const dynamicMiddle = Decoration.mark({
                                attributes: { class: `cm-hashtag cm-tag-non-latin ${dynamicClassName}` }
                            });
                            const dynamicEnd = Decoration.mark({
                                attributes: { class: `cm-hashtag cm-hashtag-end cm-tag-non-latin ${dynamicClassName}` }
                            });

                            // Distribute decorations across nodes           
                            currentTagNodes.forEach((subNode, index) => {
                                if (index === 0) {
                                    // First element, the hash symbol (#) gets all base classes + cm-hashtag-begin
                                    builder.push(dynamicBegin.range(subNode.from, subNode.to));
                                } else if (index === currentTagNodes.length - 1) {
                                    // Last element gets all base classes + cm-hashtag-end
                                    builder.push(dynamicEnd.range(subNode.from, subNode.to));
                                } else {
                                    // All intermediate elements get base classes
                                    builder.push(dynamicMiddle.range(subNode.from, subNode.to));
                                }
                            });
                        }

                        tagStartFrom = null;
                        currentTagNodes = [];
                    }
                }
            });
        }

        return Decoration.set(builder, true);
    }
}

const tagHighlighterPlugin = ViewPlugin.fromClass(CyrillicNonLatinTags, {
    decorations: (v: CyrillicNonLatinTags) => v.decorations
});

export default class NonLatinTagPlugin extends Plugin {

    onload() {
        this.registerEditorExtension([tagHighlighterPlugin, tagThemeExtension]);
    }

}
