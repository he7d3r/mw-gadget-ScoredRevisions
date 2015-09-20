Installation
===========================

1. Go to one of the js subpages of your user page. You can choose a page such as these:
  * [meta:User:`<Name>`/global.js](https://meta.wikimedia.org/wiki/Special:MyPage/global.js), which will be loaded in all wikis, in all skins
  * [meta:User:`<Name>`/common.js](https://meta.wikimedia.org/wiki/Special:MyPage/common.js), which will be loaded only on Meta-wiki, in all skins
  * [meta:User:`<Name>`/vector.js](https://meta.wikimedia.org/wiki/Special:MyPage/vector.js), which will be loaded only on Meta-wiki, in the vector skin
2. Copy the following to the page you have chosen:

  ```javascript
  // [[File:User:He7d3r/Tools/ScoredRevisions.js]] (workaround for [[phab:T35355]])
  mw.loader.load( '//meta.wikimedia.org/w/index.php?title=User:He7d3r/Tools/ScoredRevisions.js&action=raw&ctype=text/javascript' );
  ```

3. Clear the cache of your browser.

This will import the minified copy of the script I maintain on Meta-wiki.

Customization
===========================
The script adds one of 4 classes (`sr-reverted-high`, `sr-reverted-medium`, `sr-reverted-low` or `sr-reverted-none`) depending on the predicted probability of being reverted, so that the default style from ScoredRevisions.css (which just changes the background color for now) can be changed using CSS. You can copy ScoredRevisions.css as a start point, and play with the styles as you like.

Here is an example which adds an icon to the left of the edits which have low probability of being reverted:

```css
reverted-low {
    background: #FFE099;
    background-image: url("https://upload.wikimedia.org/wikipedia/commons/9/90/Icons-mini-icon_alert.gif");
    background-repeat: no-repeat;
    padding-left: 20px;
    background-position: left center;
}
```
