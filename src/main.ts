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


// Внедряем CSS-стили. Убираем влияние родителя-обертки <span>, чтобы обёртка не изменяла характеристики текста тега
const tagThemeExtension = EditorView.theme({
    ".cm-hashtag:has(.cm-tag-non-latin)": {
        display: "contents !important",
        fontSize: "inherit !important",
        lineHeight: "inherit !important",
        fontFamily: "inherit !important",
        fontWeight: "inherit !important"
    }
});

// Экспортируем класс для изолированного тестирования
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

        // 1. Символ не должен быть ASCII.
        // 2. Если первое условие выполнено, то проверяется второе условие — этот символ является буквой.
        return /(?![\u0000-\u007F])\p{L}/u.test(tagText);

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

                    // Условие начала тега
                    if (nodeName.includes("hashtag-begin")) {
                        tagStartFrom = node.from;
                        currentTagNodes = [];
                    }

                    // Собираем все составные части (span-узлы) тега
                    if (tagStartFrom !== null) {
                        currentTagNodes.push({ from: node.from, to: node.to });
                    }

                    // Условие конца тега
                    if (nodeName.includes("hashtag-end") && tagStartFrom !== null) {
                        // Текст тега без знака решетки #
                        const tagText = view.state.doc.sliceString(tagStartFrom + 1, node.to);

                        if (this.isNonLatinTag(tagText)) {

                            const dynamicClassName = `cm-tag-${tagText}`;

                            // Создаем динамические декорации для начала, середины и конца тега.
                            const dynamicBegin = Decoration.mark({
                                attributes: { class: `cm-hashtag cm-hashtag-begin cm-tag-non-latin ${dynamicClassName}` }
                            });
                            const dynamicMiddle = Decoration.mark({
                                attributes: { class: `cm-hashtag cm-tag-non-latin ${dynamicClassName}` }
                            });
                            const dynamicEnd = Decoration.mark({
                                attributes: { class: `cm-hashtag cm-hashtag-end cm-tag-non-latin ${dynamicClassName}` }
                            });

                            // Распределяем декорации по узлам
                            currentTagNodes.forEach((subNode, index) => {
                                if (index === 0) {
                                    // Первый элемент. Решетка (#) получает все базовые классы + cm-hashtag-begin
                                    builder.push(dynamicBegin.range(subNode.from, subNode.to));
                                } else if (index === currentTagNodes.length - 1) {
                                    // Последний элемент тега получает все базовые классы + cm-hashtag-end
                                    builder.push(dynamicEnd.range(subNode.from, subNode.to));
                                } else {
                                    // Все промежуточные элементы получают базовые классы
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
    decorations: (v) => v.decorations
});

export default class NonLatinTagPlugin extends Plugin {

    async onload() {
        this.registerEditorExtension([tagHighlighterPlugin, tagThemeExtension]);
    }

    onunload() {

    }
}
