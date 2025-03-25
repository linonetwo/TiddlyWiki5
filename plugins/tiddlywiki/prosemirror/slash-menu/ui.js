/*\
title: $:/plugins/tiddlywiki/prosemirror/slash-menu/ui.js
type: application/javascript
module-type: library

Plain JS implementation of the slash menu UI
\*/

"use strict";

var { SlashMenuKey, dispatchWithMeta, SlashMetaTypes, getElementById } = require("prosemirror-slash-menu");

function createSlashMenuUI(editorView) {
  // 创建菜单根元素
  var menuRoot = document.createElement("div");
  menuRoot.className = "pm-slash-menu-root";
  document.body.appendChild(menuRoot);

  // 创建菜单显示包装器
  var menuDisplay = document.createElement("div");
  menuDisplay.className = "pm-slash-menu-display";
  menuRoot.appendChild(menuDisplay);

  // 创建过滤器包装器
  var filterWrapper = document.createElement("div");
  filterWrapper.className = "pm-slash-menu-filter-wrapper";
  menuRoot.appendChild(filterWrapper);

  // 创建过滤器元素
  var filterEl = document.createElement("div");
  filterEl.className = "pm-slash-menu-filter";
  filterWrapper.appendChild(filterEl);

  // 定位菜单的函数
  function positionMenu(view) {
    var state = view.state;
    var selection = state.selection;
    var coords = view.coordsAtPos(selection.to);
    
    menuRoot.style.left = coords.left + "px";
    menuRoot.style.top = (coords.top + 20) + "px"; // 添加偏移量
    
    // 确保菜单在视口内
    var menuRect = menuRoot.getBoundingClientRect();
    var viewportHeight = window.innerHeight;
    var viewportWidth = window.innerWidth;
    
    if (menuRect.bottom > viewportHeight) {
      menuRoot.style.top = (coords.top - menuRect.height - 10) + "px";
    }
    
    if (menuRect.right > viewportWidth) {
      menuRoot.style.left = (viewportWidth - menuRect.width - 10) + "px";
    }
  }

  // 根据菜单状态获取元素的函数
  function getElements(state) {
    var { subMenuId, filteredElements } = state;

    if (!subMenuId) {
      return filteredElements;
    }

    var subMenu = getElementById(subMenuId, state);

    if (subMenu && subMenu.type === "submenu") {
      return subMenu.elements;
    }
    
    return [];
  }

  // 渲染菜单项的函数
  function renderMenuItems(view) {
    // 清除现有项
    menuDisplay.innerHTML = "";
    
    var state = view.state;
    var menuState = SlashMenuKey.getState(state);
    
    if (!menuState || !menuState.open) {
      menuRoot.style.display = "none";
      return;
    }
    
    menuRoot.style.display = "block";
    positionMenu(view);
    
    // 更新过滤器显示
    filterEl.textContent = menuState.filter || "输入以筛选...";
    
    // 为子菜单添加返回按钮
    if (menuState.subMenuId) {
      var subMenu = getElementById(menuState.subMenuId, menuState);
      var backButton = document.createElement("div");
      backButton.className = "pm-slash-menu-element";
      backButton.innerHTML = '<span>←</span><span class="pm-slash-menu-submenu-label">' + subMenu.label + '</span>';
      backButton.addEventListener("click", function() {
        dispatchWithMeta(view, SlashMenuKey, {
          type: SlashMetaTypes.closeSubMenu,
          element: subMenu
        });
        view.focus();
      });
      menuDisplay.appendChild(backButton);
    }
    
    // 渲染菜单项
    var elements = getElements(menuState);
    
    if (elements && elements.length > 0) {
      elements.forEach(function(el) {
        var itemEl = document.createElement("div");
        itemEl.className = "pm-slash-menu-element";
        itemEl.id = el.id;
        
        if (el.id === menuState.selected) {
          itemEl.classList.add("pm-slash-menu-element-selected");
        }
        
        var labelEl = document.createElement("span");
        labelEl.className = "pm-slash-menu-element-label";
        labelEl.textContent = el.label;
        
        itemEl.appendChild(labelEl);
        
        itemEl.addEventListener("click", function() {
          if (el.type === "command") {
            el.command(view);
            dispatchWithMeta(view, SlashMenuKey, {
              type: SlashMetaTypes.execute
            });
          } else if (el.type === "submenu") {
            dispatchWithMeta(view, SlashMenuKey, {
              type: SlashMetaTypes.openSubMenu,
              element: el
            });
          }
          view.focus();
        });
        
        menuDisplay.appendChild(itemEl);
      });
    } else {
      var placeholder = document.createElement("div");
      placeholder.className = "pm-slash-menu-placeholder";
      placeholder.textContent = "没有匹配的项目";
      menuDisplay.appendChild(placeholder);
    }
  }

  // 添加文档点击处理程序，点击外部时关闭菜单
  function handleOutsideClick(event) {
    if (!menuRoot.contains(event.target) && menuRoot.style.display === "block") {
      dispatchWithMeta(editorView, SlashMenuKey, {
        type: SlashMetaTypes.close
      });
    }
  }
  
  document.addEventListener("mousedown", handleOutsideClick);

  return {
    update: function(view) {
      renderMenuItems(view);
    },
    destroy: function() {
      document.removeEventListener("mousedown", handleOutsideClick);
      if (menuRoot.parentNode) {
        menuRoot.parentNode.removeChild(menuRoot);
      }
    }
  };
}

exports.createSlashMenuUI = createSlashMenuUI;
