**English** | [Русский][1]

# Cyrillic and Non-Latin Tags (Obsidian Plugin)

The plugin adds custom CSS classes to tags containing any non-Latin letters (cyrillic, hieroglyphs, diacritics, etc.) in **Editing view**. 

This allows you to customize the appearance of non-Latin tags via CSS or configure their styling using third-party plugins (such as *Colored Tags Wrangler*).

## How It Works for the User

Simply install and enable the plugin in your Obsidian settings. It requires zero configuration and is controlled by a single toggle switch.

The plugin analyzes the tag content and processes only those that contain at least one non-Latin letter.

**Latin tags** (e.g., `#task`) remain untouched and retain standard Obsidian classes.

**Non-Latin tags** receive two additional classes:
* **Generic class:** `cm-tag-non-latin` — for styling all non-Latin tags.
* **Personal dynamic class:** `cm-tag-[tag_name]` — for fine-tuning specific tags.

**Example 1.** The `#завершено` tag will receive the generic class `cm-tag-non-latin` and the personal class `cm-tag-завершено`.

**Example 2.** The `#초봄날` tag will receive the generic `cm-tag-non-latin` class and the personal `cm-tag-초봄날` class.

## CSS Styling Examples

You can use these classes in your CSS snippet inside the `.obsidian/snippets` folder to visually highlight your tags.

### Styling All Non-Latin Tags

```css
.cm-tag-non-latin { 
 	background-color: green; 
 	color: whitesmoke; 
} 
```

### Styling a Particular Non-Latin Tag

The `#завершено` tag:

```css
.cm-tag-завершено { 
    background-color: royalblue; 
    color: #ffffff; 
    font-weight: bold; 
} 
```

The `#초봄날` tag:

```css
.cm-tag-초봄날 {
    background-color: #E2F0D9;
    color: #386641;
}
```


### Working with Nested Tags (Forward Slash)

Following the Obsidian style for Latin tags, the plugin removes slashes in the class name for nested non-Latin tags, such as `#книга/глава1/часть2`.

In the DOM structure, the class name looks like this: `<span class="cm-tag-книгаглава1часть2">`.

Styling in the CSS file:
```css
.cm-tag-книгаглава1часть2 {  
    color: grey;  
    background-color: mistyrose;
}
```

This approach also ensures compatibility with third-party plugins for styling nested non-Latin tags.

### Emojis and digits

Emojis and digits (e.g., `#test😊`, `#task123`) **do not turn** a tag into a non-Latin one if all other letters inside it are Latin.

## Implementation Details for Developers

Each tag in Obsidian is composed of multiple `<span>` elements. When the plugin detects a non-Latin tag, it iterates through all its constituent HTML elements and injects custom classes into their `class` attribute.

Elements of Latin tags remain untouched.

### Nested \<span\> Elements

When a class is added to a `<span>` element, an additional nested `<span>` element is automatically generated within the DOM structure, which then holds the actual tag content.

The resulting structure looks like this:
```html
<span class="..."> <!-- original parent element -->
	<span class="...">tag_name</span> <!-- nested element -->
</span>
```

The plugin only adds new classes to the nested `<span>` elements. Parent elements retain their original Obsidian classes.


### Compatibility with Third-Party Plugins

To ensure third-party plugins can recognize and style tags processed by this plugin, the nested `<span>` elements must contain the standard Obsidian `cm-hashtag` class. Therefore, the plugin also injects the class into these elements. 


### Nested Elements and Style Preservation
 
When a nested structure of elements containing the `cm-hashtag` class appears, the default styling breaks: extra paddings/margins appear, and the tag's font size decreases.

This happens due to the following class layering:

```html
<span class="cm-hashtag ..."> <!-- parent element -->
	<span class="cm-hashtag ...">tag_name</span> <!-- nested element -->
</span>
```

To preserve the original style, the plugin integrates a custom theme extension that neutralizes the parent `<span>` element's impact on non-Latin tags:

```javascript
const tagThemeExtension = EditorView.theme({
    ".cm-hashtag:has(.cm-tag-non-latin)": {
        display: "contents !important",
        fontSize: "inherit !important",
        lineHeight: "inherit !important",
        fontFamily: "inherit !important",
        fontWeight: "inherit !important"
    }
});
```


## DOM Structure

A tag in Obsidian is composed of two or more `<span>` elements.  By traversing the syntax tree and analyzing the nodes, the plugin injects the following additional classes into the elements of non-Latin tags.

### Classes for All \<span\> Elements

* `cm-hashtag` — base Obsidian system class.
* `cm-tag-non-latin` — global class for all non-Latin tags.
* `cm-tag-[tag_name]` — personal dynamic class. The tag name is generated "as is", preserving all characters except for forward slashes (`/`).

### Boundary Classes for Tag Limits

1. The first element (the `#` symbol) additionally receives the `cm-hashtag-begin` class.
2. The last element (the end of the tag) additionally receives the `cm-hashtag-end` class.

### Example: DOM Structure for the tag

Let's consider the `#тег_тест` tag.

Obsidian splits this tag with an underscore into three separate `<span>` elements. The plugin locates them in the syntax tree and appends the custom classes:

```html
<!-- 1. First element (the '#' symbol) -->
<span class="cm-hashtag cm-hashtag-begin cm-tag-non-latin cm-tag-тег_тест">#</span> 

<!-- 2. Second element -->
<span class="cm-hashtag cm-tag-non-latin cm-tag-тег_тест">тег_</span> 

<!-- 3. Last element -->
<span class="cm-hashtag cm-hashtag-end cm-tag-non-latin cm-tag-тег_тест">тест</span> 
```



## Testing

The source code is covered by unit tests using `Vitest`. The tests verify various linguistic combinations, edge-case ASCII characters, nested tags and emojis.

## License

This project is distributed under the free MIT License.

[1]:	https://github.com/javatutor-ru/obsidian-cyrillic-non-latin-tags/blob/main/README_RU.md