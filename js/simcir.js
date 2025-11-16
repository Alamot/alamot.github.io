//
// SimcirJS
//
// Copyright (c) 2014 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

// includes following device types:
//  In
//  Out
//  Joint

'use strict';

var simcir = {};

//
// https://github.com/kazuhikoarase/lessQuery
//
simcir.$ = function() {

  var debug = location.hash == '#debug';

  var cacheIdKey = '.lessqCacheId';
  var cacheIdSeq = 0;
  var cache = {};

  var getCache = function(elm) {
    var cacheId = elm[cacheIdKey];
    if (typeof cacheId == 'undefined') {
      elm[cacheIdKey] = cacheId = cacheIdSeq++;
      cache[cacheId] = debug? { e : elm } : {};
    }
    return cache[cacheId];
  };

  var hasCache = function(elm) {
    return typeof elm[cacheIdKey] != 'undefined';
  };

  if (debug) {
    var lastKeys = {};
    var showCacheCount = function() {
      var cnt = 0;
      var keys = {};
      for (var k in cache) {
        cnt += 1;
        if (!lastKeys[k]) {
          console.log(cache[k]);
        }
        keys[k] = true;
      }
      lastKeys = keys;
      console.log('cacheCount:' + cnt);
      window.setTimeout(showCacheCount, 5000);
    };
    showCacheCount();
  }

  var removeCache = function(elm) {

    if (typeof elm[cacheIdKey] != 'undefined') {

      // remove all listeners
      var cacheId = elm[cacheIdKey];
      var listenerMap = cache[cacheId].listenerMap;
      for (var type in listenerMap) {
        var listeners = listenerMap[type];
        for (var i = 0; i < listeners.length; i += 1) {
          elm.removeEventListener(type, listeners[i]);
        }
      }

      // delete refs
      delete elm[cacheIdKey];
      delete cache[cacheId];
    }

    while (elm.firstChild) {
      removeCache(elm.firstChild);
      elm.removeChild(elm.firstChild);
    }
  };

  var getData = function(elm) {
    if (!getCache(elm).data) { getCache(elm).data = {}; }
    return getCache(elm).data;
  };

  var getListeners = function(elm, type) {
    if (!getCache(elm).listenerMap) {
      getCache(elm).listenerMap = {}; }
    if (!getCache(elm).listenerMap[type]) {
      getCache(elm).listenerMap[type] = []; }
    return getCache(elm).listenerMap[type];
  };

  // add / remove event listener.
  var addEventListener = function(elm, type, listener, add) {
    var listeners = getListeners(elm, type);
    var newListeners = [];
    for (var i = 0; i < listeners.length; i += 1) {
      if (listeners[i] != listener) {
        newListeners.push(listeners[i]);
      }
    }
    if (add) { newListeners.push(listener); }
    getCache(elm).listenerMap[type] = newListeners;
    return true;
  };

  var CustomEvent = {
    preventDefault : function() { this._pD = true; },
    stopPropagation : function() { this._sP = true; },
    stopImmediatePropagation : function() { this._sIp = true; }
  };

  var trigger = function(elm, type, data) {
    var event = { type : type, target : elm, currentTarget : null,
        _pD : false, _sP : false, _sIp : false, __proto__ : CustomEvent };
    for (var e = elm; e != null; e = e.parentNode) {
      if (!hasCache(e) ) { continue; }
      if (!getCache(e).listenerMap) { continue; }
      if (!getCache(e).listenerMap[type]) { continue; }
      event.currentTarget = e;
      var listeners = getCache(e).listenerMap[type];
      for (var i = 0; i < listeners.length; i += 1) {
        listeners[i].call(e, event, data);
        if (event._sIp) { return; }
      }
      if (event._sP) { return; }
    }
  };

  var data = function(elm, kv) {
    if (arguments.length == 2) {
      if (typeof kv == 'string') return getData(elm)[kv];
      for (var k in kv) { getData(elm)[k] = kv[k]; }
    } else if (arguments.length == 3) {
      getData(elm)[kv] = arguments[2];
    }
    return elm;
  };

  var extend = function(o1, o2) {
    for (var k in o2) { o1[k] = o2[k]; } return o1;
  };

  var each = function(it, callback) {
    if (typeof it.splice == 'function') {
      for (var i = 0; i < it.length; i += 1) { callback(i, it[i]); }
    } else {
      for (var k in it) { callback(k, it[k]); }
    }
  };

  var grep = function(list, accept) {
    var newList = [];
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (accept(item) ) {
        newList.push(item);
      }
    }
    return newList;
  };

  var addClass = function(elm, className, add) {
    var classes = (elm.getAttribute('class') || '').split(/\s+/g);
    var newClasses = '';
    for (var i = 0; i < classes.length; i+= 1) {
      if (classes[i] == className) { continue; }
      newClasses += ' ' + classes[i];
    }
    if (add) { newClasses += ' ' + className; }
    elm.setAttribute('class', newClasses);
  };

  var hasClass = function(elm, className) {
    var classes = (elm.getAttribute('class') || '').split(/\s+/g);
    for (var i = 0; i < classes.length; i+= 1) {
      if (classes[i] == className) { return true; }
    }
    return false;
  };

  var matches = function(elm, selector) {
    if (elm.nodeType != 1) {
      return false;
    } else if (!selector) {
      return true;
    }
    var sels = selector.split(/[,\s]+/g);
    for (var i = 0; i < sels.length; i += 1) {
      var sel = sels[i];
      if (sel.substring(0, 1) == '#') {
        throw 'not supported:' + sel;
      } else if (sel.substring(0, 1) == '.') {
        if (hasClass(elm, sel.substring(1) ) ) {
          return true;
        }
      } else {
        if (elm.tagName.toUpperCase() == sel.toUpperCase() ) {
          return true;
        }
      }
    }
    return false;
  };

  var parser = new window.DOMParser();

  var html = function(html) {
    var doc = parser.parseFromString(
        '<div xmlns="http://www.w3.org/1999/xhtml">' + html + '</div>',
        'text/xml').firstChild;
    var elms = [];
    while (doc.firstChild) {
      elms.push(doc.firstChild);
      doc.removeChild(doc.firstChild);
    }
    elms.__proto__ = fn;
    return elms;
  };

  var pxToNum = function(px) {
    if (typeof px != 'string' || px.length <= 2 ||
        px.charAt(px.length - 2) != 'p' ||
        px.charAt(px.length - 1) != 'x') {
      throw 'illegal px:' + px;
    }
    return +px.substring(0, px.length - 2);
  };

  var buildQuery = function(data) {
    var query = '';
    for (var k in data) {
      if (query.length > 0) {
        query += '&';
      }
      query += window.encodeURIComponent(k);
      query += '=';
      query += window.encodeURIComponent(data[k]);
    }
    return query;
  };

  var parseResponse = function() {

    var contentType = this.getResponseHeader('content-type');
    if (contentType != null) {
      contentType = contentType.replace(/\s*;.+$/, '').toLowerCase();
    }

    if (contentType == 'text/xml' ||
          contentType == 'application/xml') {
      return parser.parseFromString(this.responseText, 'text/xml');
    } else if (contentType == 'text/json' ||
        contentType == 'application/json') {
      return JSON.parse(this.responseText);
    } else {
      return this.response;
    }
  };

  var ajax = function(params) {

    params = extend({
      url: '',
      method : 'GET',
      contentType : 'application/x-www-form-urlencoded;charset=UTF-8',
      cache: true,
      processData: true,
      async : true
    }, params);

    if (!params.async) {
      // force async.
      throw 'not supported.';
    }

    var method = params.method.toUpperCase();
    var data = null;
    var contentType = params.contentType;
    if (method == 'POST' || method == 'PUT') {
      data = (typeof params.data == 'object' && params.processData)?
          buildQuery(params.data) : params.data;
    } else {
      contentType = false;
    }

    var xhr = params.xhr? params.xhr() : new window.XMLHttpRequest();
    xhr.open(method, params.url, params.async);
    if (contentType !== false) {
      xhr.setRequestHeader('Content-Type', contentType);
    }
    xhr.onreadystatechange = function() {
      if(xhr.readyState == window.XMLHttpRequest.DONE) {
        try {
          if (xhr.status == 200) {
            done.call(xhr, parseResponse.call(this) );
          } else {
            fail.call(xhr);
          }
        } finally {
          always.call(xhr);
        }
      }
    };

    // call later
    window.setTimeout(function() { xhr.send(data); }, 0);

    // callbacks
    var done = function(data) {};
    var fail = function() {};
    var always = function() {};

    var $ = {
      done : function(callback) { done = callback; return $; },
      fail : function(callback) { fail = callback; return $; },
      always : function(callback) { always = callback; return $; },
      abort : function() { xhr.abort(); return $; }
    };
    return $;
  };

  // 1. for single element
  var fn = {
    attr : function(kv) {
      if (arguments.length == 1) {
        if (typeof kv == 'string') return this.getAttribute(kv);
        for (var k in kv) { this.setAttribute(k, kv[k]); }
      } else if (arguments.length == 2) {
        this.setAttribute(kv, arguments[1]);
      }
      return this;
    },
    prop : function(kv) {
      if (arguments.length == 1) {
        if (typeof kv == 'string') return this[kv];
        for (var k in kv) { this[k] = kv[k]; }
      } else if (arguments.length == 2) {
        this[kv] = arguments[1];
      }
      return this;
    },
    css : function(kv) {
      if (arguments.length == 1) {
        if (typeof kv == 'string') return this.style[kv];
        for (var k in kv) { this.style[k] = kv[k]; }
      } else if (arguments.length == 2) {
        this.style[kv] = arguments[1];
      }
      return this;
    },
    data : function(kv) {
      var args = [ this ];
      for (var i = 0; i < arguments.length; i += 1) {
        args.push(arguments[i]);
      }; 
      return data.apply(null, args);
    },
    val : function() {
      if (arguments.length == 0) {
        return this.value || '';
      } else if (arguments.length == 1) {
        this.value = arguments[0];
      }
      return this;
    },
    on : function(type, listener) {
      var types = type.split(/\s+/g);
      for (var i = 0; i < types.length; i += 1) {
        this.addEventListener(types[i], listener);
        addEventListener(this, types[i], listener, true);
      }
      return this;
    },
    off : function(type, listener) {
      var types = type.split(/\s+/g);
      for (var i = 0; i < types.length; i += 1) {
        this.removeEventListener(types[i], listener);
        addEventListener(this, types[i], listener, false);
      }
      return this;
    },
    trigger : function(type, data) {
      trigger(this, type, data);
      return this;
    },
    offset : function() {
      var off = { left : 0, top : 0 };
      var base = null;
      for (var e = this; e.parentNode != null; e = e.parentNode) {
        if (e.offsetParent != null) {
          base = e;
          break;
        }
      }
      if (base != null) {
        for (var e = base; e.offsetParent != null; e = e.offsetParent) {
          off.left += e.offsetLeft;
          off.top += e.offsetTop;
        }
      }
      for (var e = this; e.parentNode != null &&
            e != document.body; e = e.parentNode) {
        off.left -= e.scrollLeft;
        off.top -= e.scrollTop;
      }
      return off;
    },
    append : function(elms) {
      if (typeof elms == 'string') {
        elms = html(elms);
      }
      for (var i = 0; i < elms.length; i += 1) {
        this.appendChild(elms[i]);
      }
      return this;
    },
    prepend : function(elms) {
      if (typeof elms == 'string') {
        elms = html(elms);
      }
      for (var i = 0; i < elms.length; i += 1) {
        if (this.firstChild) {
          this.insertBefore(elms[i], this.firstChild);
        } else {
          this.appendChild(elms[i]);
        }
      }
      return this;
    },
    insertBefore : function(elms) {
      var elm = elms[0];
      elm.parentNode.insertBefore(this, elm);
      return this;
    },
    insertAfter : function(elms) {
      var elm = elms[0];
      if (elm.nextSibling) {
        elm.parentNode.insertBefore(this, elm.nextSibling);
      } else {
        elm.parentNode.appendChild(this);
      }
      return this;
    },
    remove : function() {
      if (this.parentNode) { this.parentNode.removeChild(this); }
      removeCache(this);
      return this;
    },
    detach : function() {
      if (this.parentNode) { this.parentNode.removeChild(this); }
      return this;
    },
    parent : function() {
      return $(this.parentNode);
    },
    closest : function(selector) {
      for (var e = this; e != null; e = e.parentNode) {
        if (matches(e, selector) ) {
          return $(e);
        }
      }
      return $();
    },
    find : function(selector) {
      var elms = [];
      var childNodes = this.querySelectorAll(selector);
      for (var i = 0; i < childNodes.length; i += 1) {
        elms.push(childNodes.item(i) );
      }
      elms.__proto__ = fn;
      return elms;
    },
    children : function(selector) {
      var elms = [];
      var childNodes = this.childNodes;
      for (var i = 0; i < childNodes.length; i += 1) {
        if (matches(childNodes.item(i), selector) ) {
          elms.push(childNodes.item(i) );
        }
      }
      elms.__proto__ = fn;
      return elms;
    },
    index : function(selector) {
      return Array.prototype.indexOf.call(
          $(this).parent().children(selector), this);
    },
    clone : function() { return $(this.cloneNode(true) ); },
    focus : function() { this.focus(); return this; },
    select : function() { this.select(); return this; },
    submit : function() { this.submit(); return this; },
    scrollLeft : function() {
      if (arguments.length == 0) return this.scrollLeft;
      this.scrollLeft = arguments[0]; return this;
    },
    scrollTop : function() {
      if (arguments.length == 0) return this.scrollTop;
      this.scrollTop = arguments[0]; return this;
    },
    html : function() {
      if (arguments.length == 0) return this.innerHTML;
      this.innerHTML = arguments[0]; return this;
    },
    text : function() {
      if (typeof this.textContent != 'undefined') {
        if (arguments.length == 0) return this.textContent;
        this.textContent = arguments[0]; return this;
      } else {
        if (arguments.length == 0) return this.innerText;
        this.innerText = arguments[0]; return this;
      }
    },
    outerWidth : function(margin) {
      var w = this.offsetWidth;
      if (margin) {
        var cs = window.getComputedStyle(this, null);
        return w + pxToNum(cs.marginLeft) + pxToNum(cs.marginRight);
      }
      return w;
    },
    innerWidth : function() {
      var cs = window.getComputedStyle(this, null);
      return this.offsetWidth -
        pxToNum(cs.borderLeftWidth) - pxToNum(cs.borderRightWidth);
    },
    width : function() {
      if (this == window) return this.innerWidth;
      var cs = window.getComputedStyle(this, null);
      return this.offsetWidth -
        pxToNum(cs.borderLeftWidth) - pxToNum(cs.borderRightWidth) -
        pxToNum(cs.paddingLeft) - pxToNum(cs.paddingRight);
    },
    outerHeight : function(margin) {
      var h = this.offsetHeight;
      if (margin) {
        var cs = window.getComputedStyle(this, null);
        return h + pxToNum(cs.marginTop) + pxToNum(cs.marginBottom);
      }
      return h;
    },
    innerHeight : function() {
      var cs = window.getComputedStyle(this, null);
      return this.offsetHeight -
        pxToNum(cs.borderTopWidth) - pxToNum(cs.borderBottomWidth);
    },
    height : function() {
      if (this == window) return this.innerHeight;
      var cs = window.getComputedStyle(this, null);
      return this.offsetHeight -
        pxToNum(cs.borderTopWidth) - pxToNum(cs.borderBottomWidth) -
        pxToNum(cs.paddingTop) - pxToNum(cs.paddingBottom);
    },
    addClass : function(className) {
      addClass(this, className, true); return this;
    },
    removeClass : function(className) {
      addClass(this, className, false); return this;
    },
    hasClass : function(className) {
      return hasClass(this, className);
    }
  };

  // 2. to array
  each(fn, function(name, func) {
    fn[name] = function() {
      var newRet = null;
      for (var i = 0; i < this.length; i += 1) {
        var elm = this[i];
        var ret = func.apply(elm, arguments);
        if (elm !== ret) {
          if (ret != null && ret.__proto__ == fn) {
            if (newRet == null) { newRet = []; }
            newRet = newRet.concat(ret);
          } else {
            return ret;
          }
        }
      }
      if (newRet != null) {
        newRet.__proto__ = fn;
        return newRet;
      }
      return this;
    };
  });

  // 3. for array
  fn = extend(fn, {
    each : function(callback) {
      for (var i = 0; i < this.length; i += 1) {
        callback.call(this[i], i);
      }
      return this;
    },
    first : function() {
      return $(this.length > 0? this[0] : null);
    },
    last : function() {
      return $(this.length > 0? this[this.length - 1] : null);
    }
  });

  var $ = function(target) {

    if (typeof target == 'function') {

      // ready
      return $(document).on('DOMContentLoaded', target);

    } else if (typeof target == 'string') {

      if (target.charAt(0) == '<') {

        // dom creation
        return html(target);

      } else {

        // query
        var childNodes = document.querySelectorAll(target);
        var elms = [];
        for (var i = 0; i < childNodes.length; i += 1) {
          elms.push(childNodes.item(i) );
        }
        elms.__proto__ = fn;
        return elms;
      }

    } else if (typeof target == 'object' && target != null) {

      if (target.__proto__ == fn) {
        return target;
      } else {
        var elms = [];
        elms.push(target);
        elms.__proto__ = fn;
        return elms;
      }

    } else {

      var elms = [];
      elms.__proto__ = fn;
      return elms;
    }
  };

  return extend($, {
    fn : fn, extend : extend, each : each, grep : grep,
    data : data, ajax : ajax });
}();

!function($s) {

  var $ = $s.$;

  var createSVGElement = function(tagName) {
    return $(document.createElementNS(
        'http://www.w3.org/2000/svg', tagName) );
  };

  var createSVG = function(w, h) {
    return createSVGElement('svg').attr({
      version: '1.1',
      width: w, height: h,
      viewBox: '0 0 ' + w + ' ' + h
    });
  };

  var graphics = function($target) {
    var attr = {};
    var buf = '';
    var moveTo = function(x, y) {
      buf += ' M ' + x + ' ' + y;
    };
    var lineTo = function(x, y) {
      buf += ' L ' + x + ' ' + y;
    };
    var curveTo = function(x1, y1, x, y) {
      buf += ' Q ' + x1 + ' ' + y1 + ' ' + x + ' ' + y;
    };
    var closePath = function(close) {
      if (close) {
        // really close path.
        buf += ' Z';
      }
      $target.append(createSVGElement('path').
          attr('d', buf).attr(attr) );
      buf = '';
    };
    var drawRect = function(x, y, width, height) {
      $target.append(createSVGElement('rect').
          attr({x: x, y: y, width: width, height: height}).attr(attr) );
    };
    var drawCircle = function(x, y, r) {
      $target.append(createSVGElement('circle').
          attr({cx: x, cy: y, r: r}).attr(attr) );
    };
    return {
      attr: attr,
      moveTo: moveTo,
      lineTo: lineTo,
      curveTo: curveTo,
      closePath: closePath,
      drawRect: drawRect,
      drawCircle: drawCircle
    };
  };

  var transform = function() {
    var attrX = 'simcir-transform-x';
    var attrY = 'simcir-transform-y';
    var attrRotate = 'simcir-transform-rotate';
    var num = function($o, k) {
      var v = $o.attr(k);
      return v? +v : 0;
    };
    return function($o, x, y, rotate) {
      if (arguments.length >= 3) {
        var transform = 'translate(' + x + ' ' + y + ')';
        if (rotate) {
          transform += ' rotate(' + rotate + ')';
        }
        $o.attr('transform', transform);
        $o.attr(attrX, x);
        $o.attr(attrY, y);
        $o.attr(attrRotate, rotate);
      } else if (arguments.length == 1) {
        return {x: num($o, attrX), y: num($o, attrY),
          rotate: num($o, attrRotate)};
      }
    };
  }();

  var offset = function($o) {
    var x = 0;
    var y = 0;
    while ($o[0].nodeName != 'svg') {
      var pos = transform($o);
      x += pos.x;
      y += pos.y;
      $o = $o.parent();
    }
    return {x: x, y: y};
  };

  var enableEvents = function($o, enable) {
    $o.css('pointer-events', enable? 'visiblePainted' : 'none');
  };

  var disableSelection = function($o) {
    $o.each(function() {
      this.onselectstart = function() { return false; };
    }).css('-webkit-user-select', 'none');
  };

  var controller = function() {
    var id = 'controller';
    return function($ui, controller) {
      if (arguments.length == 1) {
        return $.data($ui[0], id);
      } else if (arguments.length == 2) {
        $.data($ui[0], id, controller);
      }
    };
  }();

  var eventQueue = function() {
    var delay = 50; // ms
    var limit = 40; // ms
    var _queue = null;
    var postEvent = function(event) {
      if (_queue == null) {
        _queue = [];
      }
      _queue.push(event);
    };
    var dispatchEvent = function() {
      var queue = _queue;
      _queue = null;
      while (queue.length > 0) {
        var e = queue.shift();
        e.target.trigger(e.type);
      }
    };
    var getTime = function() {
      return new Date().getTime();
    };
    var timerHandler = function() {
      var start = getTime();
      while (_queue != null && getTime() - start < limit) {
        dispatchEvent();
      }
      window.setTimeout(timerHandler, 
        Math.max(delay - limit, delay - (getTime() - start) ) );
    };
    timerHandler();
    return {
      postEvent: postEvent
    };
  }();

  var unit = 16;
  var fontSize = 12;

  var createLabel = function(text) {
    return createSVGElement('text').
      text(text).
      css('font-size', fontSize + 'px');
  };

  var createNode = function(type, label, description, headless) {
    var $node = createSVGElement('g').
      attr('simcir-node-type', type);
    if (!headless) {
      $node.attr('class', 'simcir-node');
    }
    var node = createNodeController({
      $ui: $node, type: type, label: label,
      description: description, headless: headless});
    if (type == 'in') {
      controller($node, createInputNodeController(node) );
    } else if (type == 'out') {
      controller($node, createOutputNodeController(node) );
    } else {
      throw 'unknown type:' + type;
    }
    return $node;
  };

  var isActiveNode = function($o) {
    return $o.closest('.simcir-node').length == 1 &&
      $o.closest('.simcir-toolbox').length == 0;
  };

  var createNodeController = function(node) {
    var _value = null;
    var setValue = function(value, force) {
      if (_value === value && !force) {
        return;
      }
      _value = value;
      eventQueue.postEvent({target: node.$ui, type: 'nodeValueChange'});
    };
    var getValue = function() {
      return _value;
    };

    if (!node.headless) {

      node.$ui.attr('class', 'simcir-node simcir-node-type-' + node.type);

      var $circle = createSVGElement('circle').
        attr({cx: 0, cy: 0, r: 4});
      node.$ui.on('mouseover', function(event) {
        if (isActiveNode(node.$ui) ) {
          node.$ui.addClass('simcir-node-hover');
        }
      });
      node.$ui.on('mouseout', function(event) {
        if (isActiveNode(node.$ui) ) {
          node.$ui.removeClass('simcir-node-hover');
        }
      });
      node.$ui.append($circle);
      var appendLabel = function(text, align) {
        var $label = createLabel(text).
          attr('class', 'simcir-node-label');
        enableEvents($label, false);
        if (align == 'right') {
          $label.attr('text-anchor', 'start').
            attr('x', 6).
            attr('y', fontSize / 2);
        } else if (align == 'left') {
          $label.attr('text-anchor', 'end').
            attr('x', -6).
            attr('y', fontSize / 2);
        }
        node.$ui.append($label);
      };
      if (node.label) {
        if (node.type == 'in') {
          appendLabel(node.label, 'right');
        } else if (node.type == 'out') {
          appendLabel(node.label, 'left');
        }
      }
      if (node.description) {
        if (node.type == 'in') {
          appendLabel(node.description, 'left');
        } else if (node.type == 'out') {
          appendLabel(node.description, 'right');
        }
      }
      node.$ui.on('nodeValueChange', function(event) {
        if (_value != null) {
          node.$ui.addClass('simcir-node-hot');
        } else {
          node.$ui.removeClass('simcir-node-hot');
        }
      });
    }

    return $.extend(node, {
      setValue: setValue,
      getValue: getValue
    });
  };

  var createInputNodeController = function(node) {
    var output = null;
    var setOutput = function(outNode) {
      output = outNode;
    };
    var getOutput = function() {
      return output;
    };
    return $.extend(node, {
      setOutput: setOutput,
      getOutput: getOutput
    });
  };

  var createOutputNodeController = function(node) {
    var inputs = [];
    var super_setValue = node.setValue;
    var setValue = function(value) {
      super_setValue(value);
      for (var i = 0; i < inputs.length; i += 1) {
        inputs[i].setValue(value);
      }
    };
    var connectTo = function(inNode) {
      if (inNode.getOutput() != null) {
        inNode.getOutput().disconnectFrom(inNode);
      }
      inNode.setOutput(node);
      inputs.push(inNode);
      inNode.setValue(node.getValue(), true);
    };
    var disconnectFrom = function(inNode) {
      if (inNode.getOutput() != node) {
        throw 'not connected.';
      }
      inNode.setOutput(null);
      inNode.setValue(null, true);
      inputs = $.grep(inputs, function(v) {
        return v != inNode;
      });
    };
    var getInputs = function() {
      return inputs;
    };
    return $.extend(node, {
      setValue: setValue,
      getInputs: getInputs,
      connectTo: connectTo,
      disconnectFrom: disconnectFrom
    });
  };

  var createDevice = function(deviceDef, headless, scope) {
    headless = headless || false;
    scope = scope || null;
    var $dev = createSVGElement('g');
    if (!headless) {
      $dev.attr('class', 'simcir-device');
    }
    controller($dev, createDeviceController(
        {$ui: $dev, deviceDef: deviceDef,
          headless: headless, scope: scope, doc: null}) );
    var factory = factories[deviceDef.type];
    if (factory) {
      factory(controller($dev) );
    }
    if (!headless) {
      controller($dev).createUI();
    }
    return $dev;
  };

  var createDeviceController = function(device) {
    var inputs = [];
    var outputs = [];
    var addInput = function(label, description) {
      var $node = createNode('in', label, description, device.headless);
      $node.on('nodeValueChange', function(event) {
        device.$ui.trigger('inputValueChange');
      });
      if (!device.headless) {
        device.$ui.append($node);
      }
      var node = controller($node);
      inputs.push(node);
      return node;
    };
    var addOutput = function(label, description) {
      var $node = createNode('out', label, description, device.headless);
      if (!device.headless) {
        device.$ui.append($node);
      }
      var node = controller($node);
      outputs.push(node);
      return node;
    };
    var getInputs = function() {
      return inputs;
    };
    var getOutputs = function() {
      return outputs;
    };
    var disconnectAll = function() {
      $.each(getInputs(), function(i, inNode) {
        var outNode = inNode.getOutput();
        if (outNode != null) {
          outNode.disconnectFrom(inNode);
        }
      });
      $.each(getOutputs(), function(i, outNode) {
        $.each(outNode.getInputs(), function(i, inNode) {
          outNode.disconnectFrom(inNode);
        });
      });
    };
    device.$ui.on('dispose', function() {
      $.each(getInputs(), function(i, inNode) {
        inNode.$ui.remove();
      });
      $.each(getOutputs(), function(i, outNode) {
        outNode.$ui.remove();
      });
      device.$ui.remove();
    } );

    var selected = false;
    var setSelected = function(value) {
      selected = value;
      device.$ui.trigger('deviceSelect');
    };
    var isSelected = function() {
      return selected;
    };

    var label = device.deviceDef.label;
    var defaultLabel = device.deviceDef.type;
    if (typeof label == 'undefined') {
      label = defaultLabel;
    }
    var setLabel = function(value) {
      value = value.replace(/^\s+|\s+$/g, '');
      label = value || defaultLabel;
      device.$ui.trigger('deviceLabelChange');
    };
    var getLabel = function() {
      return label;
    };

    var getSize = function() {
      var nodes = Math.max(device.getInputs().length,
          device.getOutputs().length);
      return { width: unit * 2,
        height: unit * Math.max(2, device.halfPitch?
            (nodes + 1) / 2 : nodes)};
    };

    var layoutUI = function() {

      var size = device.getSize();
      var w = size.width;
      var h = size.height;

      device.$ui.children('.simcir-device-body').
        attr({x: 0, y: 0, width: w, height: h});

      var pitch = device.halfPitch? unit / 2 : unit;
      var layoutNodes = function(nodes, x) {
        var offset = (h - pitch * (nodes.length - 1) ) / 2;
        $.each(nodes, function(i, node) {
          transform(node.$ui, x, pitch * i + offset);
        });
      };
      layoutNodes(getInputs(), 0);
      layoutNodes(getOutputs(), w);

      device.$ui.children('.simcir-device-label').
        attr({x: w / 2, y: h + fontSize});
    };

    var createUI = function() {

      device.$ui.attr('class', 'simcir-device');
      device.$ui.on('deviceSelect', function() {
        if (selected) {
          $(this).addClass('simcir-device-selected');
        } else {
          $(this).removeClass('simcir-device-selected');
        }
      });

      var $body = createSVGElement('rect').
        attr('class', 'simcir-device-body').
        attr('rx', 2).attr('ry', 2);
      device.$ui.prepend($body);

      var $label = createLabel(label).
        attr('class', 'simcir-device-label').
        attr('text-anchor', 'middle');
      device.$ui.on('deviceLabelChange', function() {
        $label.text(getLabel() );
      });

      var label_dblClickHandler = function(event) {
        event.preventDefault();
        event.stopPropagation();
        var $workspace = $(event.target).closest('.simcir-workspace');
        if (!controller($workspace).data().editable) {
          return;
        }
        var title = 'Enter device name ';
        var $labelEditor = $('<input type="text"/>').
          addClass('simcir-label-editor').
          val($label.text() ).
          on('keydown', function(event) {
            if (event.keyCode == 13) {
              // ENTER
              setLabel($(this).val() );
              $dlg.remove();
            } else if (event.keyCode == 27) {
              // ESC
              $dlg.remove();
            }
          } );
        var $placeHolder = $('<div></div>').
          append($labelEditor);
        var $dlg = showDialog(title, $placeHolder);
        $labelEditor.focus();
      };
      device.$ui.on('deviceAdd', function() {
        $label.on('dblclick', label_dblClickHandler);
      } );
      device.$ui.on('deviceRemove', function() {
        $label.off('dblclick', label_dblClickHandler);
      } );
      device.$ui.append($label);

      layoutUI();

    };

    var getState = function() { return null; };

    return $.extend(device, {
      addInput: addInput,
      addOutput: addOutput,
      getInputs: getInputs,
      getOutputs: getOutputs,
      disconnectAll: disconnectAll,
      setSelected: setSelected,
      isSelected: isSelected,
      getLabel: getLabel,
      halfPitch: false,
      getSize: getSize,
      createUI: createUI,
      layoutUI: layoutUI,
      getState: getState
    });
  };

  var createConnector = function(x1, y1, x2, y2) {
    return createSVGElement('path').
      attr('d', 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2).
      attr('class', 'simcir-connector');
  };

  var connect = function($node1, $node2) {
    var type1 = $node1.attr('simcir-node-type');
    var type2 = $node2.attr('simcir-node-type');
    if (type1 == 'in' && type2 == 'out') {
      controller($node2).connectTo(controller($node1) );
    } else if (type1 == 'out' && type2 == 'in') {
      controller($node1).connectTo(controller($node2) );
    }
  };

  var buildCircuit = function(data, headless, scope) {
    var $devices = [];
    var $devMap = {};
    var getNode = function(path) {
      if (!path.match(/^(\w+)\.(in|out)([0-9]+)$/g) ) {
        throw 'unknown path:' + path;
      }
      var devId = RegExp.$1;
      var type = RegExp.$2;
      var index = +RegExp.$3;
      return (type == 'in')?
        controller($devMap[devId]).getInputs()[index] :
        controller($devMap[devId]).getOutputs()[index];
    };
    $.each(data.devices, function(i, deviceDef) {
      var $dev = createDevice(deviceDef, headless, scope);
      transform($dev, deviceDef.x, deviceDef.y);
      $devices.push($dev);
      $devMap[deviceDef.id] = $dev;
    });
    $.each(data.connectors, function(i, conn) {
      var nodeFrom = getNode(conn.from);
      var nodeTo = getNode(conn.to);
      if (nodeFrom && nodeTo) {
        connect(nodeFrom.$ui, nodeTo.$ui);
      }
    });
    return $devices;
  };

  var dialogManager = function() {
    var dialogs = [];
    var updateDialogs = function($dlg, remove) {
      var newDialogs = [];
      $.each(dialogs, function(i) {
        if (dialogs[i] != $dlg) {
          newDialogs.push(dialogs[i]);
        }
      });
      if (!remove) {
        newDialogs.push($dlg);
      }
      // renumber z-index
      $.each(newDialogs, function(i) {
        newDialogs[i].css('z-index', '' + (i + 1) );
      });
      dialogs = newDialogs;
    };
    return {
      add : function($dlg) {
        updateDialogs($dlg);
      },
      remove : function($dlg) {
        updateDialogs($dlg, true);
      },
      toFront : function($dlg) {
        updateDialogs($dlg);
      }
    };
  }();

  var showDialog = function(title, $content) {
    var $closeButton = function() {
      var r = 16;
      var pad = 4;
      var $btn = createSVG(r, r).
        attr('class', 'simcir-dialog-close-button');
      var g = graphics($btn);
      g.drawRect(0, 0, r, r);
      g.attr['class'] = 'simcir-dialog-close-button-symbol';
      g.moveTo(pad, pad);
      g.lineTo(r - pad, r - pad);
      g.closePath();
      g.moveTo(r - pad, pad);
      g.lineTo(pad, r - pad);
      g.closePath();
      return $btn;
    }();
    var $title = $('<div></div>').
      addClass('simcir-dialog-title').
      text(title).
      css('cursor', 'default').
      on('mousedown', function(event) {
        event.preventDefault();
      });
    var $dlg = $('<div></div>').
      addClass('simcir-dialog').
      css({position:'absolute'}).
      append($title.css('float', 'left') ).
      append($closeButton.css('float', 'right') ).
      append($('<br/>').css('clear', 'both') ).
      append($content);
    $('BODY').append($dlg);
    dialogManager.add($dlg);
    var dragPoint = null;
    var dlg_mouseDownHandler = function(event) {
      if (!$(event.target).hasClass('simcir-dialog') &&
          !$(event.target).hasClass('simcir-dialog-title') ) {
        return;
      }
      event.preventDefault();
      dialogManager.toFront($dlg);
      var off = $dlg.offset();
      dragPoint = {
        x: event.pageX - off.left,
        y: event.pageY - off.top};
      $(document).on('mousemove', dlg_mouseMoveHandler);
      $(document).on('mouseup', dlg_mouseUpHandler);
    };
    var dlg_mouseMoveHandler = function(event) {
      moveTo(
          event.pageX - dragPoint.x,
          event.pageY - dragPoint.y);
    };
    var dlg_mouseUpHandler = function(event) {
      $(document).off('mousemove', dlg_mouseMoveHandler);
      $(document).off('mouseup', dlg_mouseUpHandler);
    };
    $dlg.on('mousedown', dlg_mouseDownHandler);
    $closeButton.on('mousedown', function() {
      $dlg.trigger('close');
      $dlg.remove();
      dialogManager.remove($dlg);
    });
    var w = $dlg.width();
    var h = $dlg.height();
    var cw = $(window).width();
    var ch = $(window).height();
    var getProp = function(id) {
      return $('HTML')[id]() || $('BODY')[id]();
    };
    var x = (cw - w) / 2 + getProp('scrollLeft');
    var y = (ch - h) / 2 + getProp('scrollTop');
    var moveTo = function(x, y) {
      $dlg.css({left: x + 'px', top: y + 'px'});
    };
    moveTo(x, y);
    return $dlg;
  };

  var createDeviceRefFactory = function(data) {
    return function(device) {
      var $devs = buildCircuit(data, true, {});
      var $ports = [];
      $.each($devs, function(i, $dev) {
        var deviceDef = controller($dev).deviceDef;
        if (deviceDef.type == 'In' || deviceDef.type == 'Out') {
          $ports.push($dev);
        }
      });
      $ports.sort(function($p1, $p2) {
        var x1 = controller($p1).deviceDef.x;
        var y1 = controller($p1).deviceDef.y;
        var x2 = controller($p2).deviceDef.x;
        var y2 = controller($p2).deviceDef.y;
        if (x1 == x2) {
          return (y1 < y2)? -1 : 1;
        }
        return (x1 < x2)? -1 : 1;
      });
      var getDesc = function(port) {
        return port? port.description : '';
      };
      $.each($ports, function(i, $port) {
        var port = controller($port);
        var portDef = port.deviceDef;
        var inPort;
        var outPort;
        if (portDef.type == 'In') {
          outPort = port.getOutputs()[0];
          inPort = device.addInput(portDef.label,
              getDesc(outPort.getInputs()[0]) );
          // force disconnect test devices that connected to In-port
          var inNode = port.getInputs()[0];
          if (inNode.getOutput() != null) {
            inNode.getOutput().disconnectFrom(inNode);
          }
        } else if (portDef.type == 'Out') {
          inPort = port.getInputs()[0];
          outPort = device.addOutput(portDef.label,
              getDesc(inPort.getOutput() ) );
          // force disconnect test devices that connected to Out-port
          var outNode = port.getOutputs()[0];
          $.each(outNode.getInputs(), function(i, inNode) {
            if (inNode.getOutput() != null) {
              inNode.getOutput().disconnectFrom(inNode);
            }
          } );
        }
        inPort.$ui.on('nodeValueChange', function() {
          outPort.setValue(inPort.getValue() );
        });
      });
      var super_getSize = device.getSize;
      device.getSize = function() {
        var size = super_getSize();
        return {width: unit * 4, height: size.height};
      };
      device.$ui.on('dispose', function() {
        $.each($devs, function(i, $dev) {
          $dev.trigger('dispose');
        });
      } );
      device.$ui.on('dblclick', function(event) {
        // open library,
        event.preventDefault();
        event.stopPropagation();
        showDialog(device.deviceDef.label || device.deviceDef.type,
            setupSimcir($('<div></div>'), data) ).on('close', function() {
              $(this).find('.simcir-workspace').trigger('dispose');
            });
      });
    };
  };

  var createCustomLayoutDeviceRefFactory = function(data) {
    return function(device) {
      var $devs = buildCircuit(data, true, {});
      var $ports = [];
      var intfs = [];
      $.each($devs, function(i, $dev) {
        var deviceDef = controller($dev).deviceDef;
        if (deviceDef.type == 'In' || deviceDef.type == 'Out') {
          $ports.push($dev);
        }
      });
      var getDesc = function(port) {
        return port? port.description : '';
      };
      $.each($ports, function(i, $port) {
        var port = controller($port);
        var portDef = port.deviceDef;
        var inPort;
        var outPort;
        if (portDef.type == 'In') {
          outPort = port.getOutputs()[0];
          inPort = device.addInput();
          intfs.push({ node : inPort, label : portDef.label,
              desc : getDesc(outPort.getInputs()[0]) });
          // force disconnect test devices that connected to In-port
          var inNode = port.getInputs()[0];
          if (inNode.getOutput() != null) {
            inNode.getOutput().disconnectFrom(inNode);
          }
        } else if (portDef.type == 'Out') {
          inPort = port.getInputs()[0];
          outPort = device.addOutput();
          intfs.push({ node : outPort, label : portDef.label,
              desc : getDesc(inPort.getOutput() ) });
          // force disconnect test devices that connected to Out-port
          var outNode = port.getOutputs()[0];
          $.each(outNode.getInputs(), function(i, inNode) {
            if (inNode.getOutput() != null) {
              inNode.getOutput().disconnectFrom(inNode);
            }
          } );
        }
        inPort.$ui.on('nodeValueChange', function() {
          outPort.setValue(inPort.getValue() );
        });
      });
      var layout = data.layout;
      var cols = layout.cols;
      var rows = layout.rows;
      rows = ~~( (Math.max(1, rows) + 1) / 2) * 2;
      cols = ~~( (Math.max(1, cols) + 1) / 2) * 2;
      var updateIntf = function(intf, x, y, align) {
        transform(intf.node.$ui, x, y);
        if (!intf.$label) {
          intf.$label = createLabel(intf.label).
            attr('class', 'simcir-node-label');
          enableEvents(intf.$label, false);
          intf.node.$ui.append(intf.$label);
        }
        if (align == 'right') {
          intf.$label.attr('text-anchor', 'start').
            attr('x', 6).
            attr('y', fontSize / 2);
        } else if (align == 'left') {
          intf.$label.attr('text-anchor', 'end').
            attr('x', -6).
            attr('y', fontSize / 2);
        } else if (align == 'top') {
          intf.$label.attr('text-anchor', 'middle').
            attr('x', 0).
            attr('y', -6);
        } else if (align == 'bottom') {
          intf.$label.attr('text-anchor', 'middle').
            attr('x', 0).
            attr('y', fontSize + 6);
        }
      };
      var doLayout = function() {
        var x = 0;
        var y = 0;
        var w = unit * cols / 2;
        var h = unit * rows / 2;
        device.$ui.children('.simcir-device-label').
          attr({y : y + h + fontSize});
        device.$ui.children('.simcir-device-body').
          attr({x: x, y: y, width: w, height: h});
        $.each(intfs, function(i, intf) {
          if (layout.nodes[intf.label] &&
              layout.nodes[intf.label].match(/^([TBLR])([0-9]+)$/) ) {
            var off = +RegExp.$2 * unit / 2;
            switch(RegExp.$1) {
            case 'T' : updateIntf(intf, x + off, y, 'bottom'); break;
            case 'B' : updateIntf(intf, x + off, y + h, 'top'); break;
            case 'L' : updateIntf(intf, x, y + off, 'right'); break;
            case 'R' : updateIntf(intf, x + w, y + off, 'left'); break;
            }
          } else {
            transform(intf.node.$ui, 0, 0);
          }
        });
      };
      device.getSize = function() {
        return {width: unit * cols / 2, height: unit * rows / 2};
      };
      device.$ui.on('dispose', function() {
        $.each($devs, function(i, $dev) {
          $dev.trigger('dispose');
        });
      } );
      if (data.layout.hideLabelOnWorkspace) {
        device.$ui.on('deviceAdd', function() {
          device.$ui.children('.simcir-device-label').css('display', 'none');
        }).on('deviceRemove', function() {
          device.$ui.children('.simcir-device-label').css('display', '');
        });
      }
      device.$ui.on('dblclick', function(event) {
        // open library,
        event.preventDefault();
        event.stopPropagation();
        showDialog(device.deviceDef.label || device.deviceDef.type,
            setupSimcir($('<div></div>'), data) ).on('close', function() {
              $(this).find('.simcir-workspace').trigger('dispose');
            });
      });
      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();
        doLayout();
      };
    };
  };

  var factories = {};
  var defaultToolbox = [];
  var registerDevice = function(type, factory, deprecated) {
    if (typeof factory == 'object') {
      if (typeof factory.layout == 'object') {
        factory = createCustomLayoutDeviceRefFactory(factory);
      } else {
        factory = createDeviceRefFactory(factory);
      }
    }
    factories[type] = factory;
    if (!deprecated) {
      defaultToolbox.push({type: type});
    }
  };

  var createScrollbar = function() {

    // vertical only.
    var _value = 0;
    var _min = 0;
    var _max = 0;
    var _barSize = 0;
    var _width = 0;
    var _height = 0;

    var $body = createSVGElement('rect');
    var $bar = createSVGElement('g').
      append(createSVGElement('rect') ).
      attr('class', 'simcir-scrollbar-bar');
    var $scrollbar = createSVGElement('g').
      attr('class', 'simcir-scrollbar').
      append($body).append($bar).
      on('unitup', function(event) {
        setValue(_value - unit * 2);
      }).on('unitdown', function(event) {
        setValue(_value + unit * 2);
      }).on('rollup', function(event) {
        setValue(_value - _barSize);
      }).on('rolldown', function(event) {
        setValue(_value + _barSize);
      });

    var dragPoint = null;
    var bar_mouseDownHandler = function(event) {
      event.preventDefault();
      event.stopPropagation();
      var pos = transform($bar);
      dragPoint = {
          x: event.pageX - pos.x,
          y: event.pageY - pos.y};
      $(document).on('mousemove', bar_mouseMoveHandler);
      $(document).on('mouseup', bar_mouseUpHandler);
    };
    var bar_mouseMoveHandler = function(event) {
      calc(function(unitSize) {
        setValue( (event.pageY - dragPoint.y) / unitSize);
      });
    };
    var bar_mouseUpHandler = function(event) {
      $(document).off('mousemove', bar_mouseMoveHandler);
      $(document).off('mouseup', bar_mouseUpHandler);
    };
    $bar.on('mousedown', bar_mouseDownHandler);
    var body_mouseDownHandler = function(event) {
      event.preventDefault();
      event.stopPropagation();
      var off = $scrollbar.parent('svg').offset();
      var pos = transform($scrollbar);
      var y = event.pageY - off.top - pos.y;
      var barPos = transform($bar);
      if (y < barPos.y) {
        $scrollbar.trigger('rollup');
      } else {
        $scrollbar.trigger('rolldown');
      }
    };
    $body.on('mousedown', body_mouseDownHandler);

    var setSize = function(width, height) {
      _width = width;
      _height = height;
      layout();
    };
    var layout = function() {

      $body.attr({x: 0, y: 0, width: _width, height: _height});

      var visible = _max - _min > _barSize;
      $bar.css('display', visible? 'inline' : 'none');
      if (!visible) {
        return;
      }
      calc(function(unitSize) {
        $bar.children('rect').
          attr({x: 0, y: 0, width: _width, height: _barSize * unitSize});
        transform($bar, 0, _value * unitSize);
      });
    };
    var calc = function(f) {
      f(_height / (_max - _min) );
    };
    var setValue = function(value) {
      setValues(value, _min, _max, _barSize);
    };
    var setValues = function(value, min, max, barSize) {
      value = Math.max(min, Math.min(value, max - barSize) );
      var changed = (value != _value);
      _value = value;
      _min = min;
      _max = max;
      _barSize = barSize;
      layout();
      if (changed) {
        $scrollbar.trigger('scrollValueChange');
      }
    };
    var getValue = function() {
      return _value;
    };
    controller($scrollbar, {
      setSize: setSize,
      setValues: setValues,
      getValue: getValue
    });
    return $scrollbar;
  };

  var getUniqueId = function() {
    var uniqueIdCount = 0;
    return function() {
      return 'simcir-id' + uniqueIdCount++;
    };
  }();

  var createWorkspace = function(data) {

    data = $.extend({
      width: 400,
      height: 200,
      showToolbox: true,
      editable: true,
      toolbox: defaultToolbox,
      devices: [],
      connectors: [],
    }, data);

    var scope = {};

    var workspaceWidth = data.width;
    var workspaceHeight = data.height;
    var barWidth = unit;
    var toolboxWidth = data.showToolbox? unit * 6 + barWidth : 0;

    var connectorsValid = true;
    var connectorsValidator = function() {
      if (!connectorsValid) {
        updateConnectors();
        connectorsValid = true;
      }
    };

    var $workspace = createSVG(
        workspaceWidth, workspaceHeight).
      attr('class', 'simcir-workspace').
      on('nodeValueChange', function(event) {
        connectorsValid = false;
        window.setTimeout(connectorsValidator, 0);
      }).
      on('dispose', function() {
        $(this).find('.simcir-device').trigger('dispose');
        $toolboxPane.remove();
        $workspace.remove();
      });

    disableSelection($workspace);

    var $defs = createSVGElement('defs');
    $workspace.append($defs);

    !function() {

      // fill with pin hole pattern.
      var patId = getUniqueId();
      var pitch = unit / 2;
      var w = workspaceWidth - toolboxWidth;
      var h = workspaceHeight;

      $defs.append(createSVGElement('pattern').
          attr({id: patId, x: 0, y: 0,
            width: pitch / w, height: pitch / h}).append(
            createSVGElement('rect').attr('class', 'simcir-pin-hole').
            attr({x: 0, y: 0, width: 1, height: 1}) ) );

      $workspace.append(createSVGElement('rect').
          attr({x: toolboxWidth, y: 0, width: w, height: h}).
          css({fill: 'url(#' + patId + ')'}) );
    }();

    var $toolboxDevicePane = createSVGElement('g');
    var $scrollbar = createScrollbar();
    $scrollbar.on('scrollValueChange', function(event) {
      transform($toolboxDevicePane, 0,
          -controller($scrollbar).getValue() );
    });
    controller($scrollbar).setSize(barWidth, workspaceHeight);
    transform($scrollbar, toolboxWidth - barWidth, 0);
    var $toolboxPane = createSVGElement('g').
      attr('class', 'simcir-toolbox').
      append(createSVGElement('rect').
        attr({x: 0, y: 0,
          width: toolboxWidth,
          height: workspaceHeight}) ).
      append($toolboxDevicePane).
      append($scrollbar).on('wheel', function(event) {
        event.preventDefault();
        var oe = event.originalEvent || event;
        if (oe.deltaY < 0) {
          $scrollbar.trigger('unitup');
        } else if (oe.deltaY > 0) {
          $scrollbar.trigger('unitdown');
        }
      });

    var $devicePane = createSVGElement('g');
    transform($devicePane, toolboxWidth, 0);
    var $connectorPane = createSVGElement('g');
    var $temporaryPane = createSVGElement('g');

    enableEvents($connectorPane, false);
    enableEvents($temporaryPane, false);

    if (data.showToolbox) {
      $workspace.append($toolboxPane);
    }
    $workspace.append($devicePane);
    $workspace.append($connectorPane);
    $workspace.append($temporaryPane);

    var addDevice = function($dev) {
      $devicePane.append($dev);
      $dev.trigger('deviceAdd');
    };

    var removeDevice = function($dev) {
      $dev.trigger('deviceRemove');
      // before remove, disconnect all
      controller($dev).disconnectAll();
      $dev.trigger('dispose');
      updateConnectors();
    };

    var disconnect = function($inNode) {
      var inNode = controller($inNode);
      if (inNode.getOutput() != null) {
        inNode.getOutput().disconnectFrom(inNode);
      }
      updateConnectors();
    };

    var updateConnectors = function() {
      $connectorPane.children().remove();
      $devicePane.children('.simcir-device').each(function() {
        var device = controller($(this) );
        $.each(device.getInputs(), function(i, inNode) {
          if (inNode.getOutput() != null) {
            var p1 = offset(inNode.$ui);
            var p2 = offset(inNode.getOutput().$ui);
            var $conn = createConnector(p1.x, p1.y, p2.x, p2.y);
            if (inNode.getOutput().getValue() != null) {
              $conn.addClass('simcir-connector-hot');
            }
            $connectorPane.append($conn);
          }
        });
      });
    };

    var loadToolbox = function(data) {
      var vgap = 8;
      var y = vgap;
      $.each(data.toolbox, function(i, deviceDef) {
        var $dev = createDevice(deviceDef);
        $toolboxDevicePane.append($dev);
        var size = controller($dev).getSize();
        transform($dev, (toolboxWidth - barWidth - size.width) / 2, y);
        y += (size.height + fontSize + vgap);
      });
      controller($scrollbar).setValues(0, 0, y, workspaceHeight);
    };

    var getData = function() {

      // renumber all id
      var devIdCount = 0;
      $devicePane.children('.simcir-device').each(function() {
        var $dev = $(this);
        var device = controller($dev);
        var devId = 'dev' + devIdCount++;
        device.id = devId;
        $.each(device.getInputs(), function(i, node) {
          node.id = devId + '.in' + i;
        });
        $.each(device.getOutputs(), function(i, node) {
          node.id = devId + '.out' + i;
        });
      });

      var toolbox = [];
      var devices = [];
      var connectors = [];
      var clone = function(obj) {
        return JSON.parse(JSON.stringify(obj) );
      };
      $toolboxDevicePane.children('.simcir-device').each(function() {
        var $dev = $(this);
        var device = controller($dev);
        toolbox.push(device.deviceDef);
      });
      $devicePane.children('.simcir-device').each(function() {
        var $dev = $(this);
        var device = controller($dev);
        $.each(device.getInputs(), function(i, inNode) {
          if (inNode.getOutput() != null) {
            connectors.push({from:inNode.id, to:inNode.getOutput().id});
          }
        });
        var pos = transform($dev);
        var deviceDef = clone(device.deviceDef);
        deviceDef.id = device.id;
        deviceDef.x = pos.x;
        deviceDef.y = pos.y;
        deviceDef.label = device.getLabel();
        var state = device.getState();
        if (state != null) {
          deviceDef.state = state;
        }
        devices.push(deviceDef);
      });
      return {
        width: data.width,
        height: data.height,
        showToolbox: data.showToolbox,
        editable: data.editable,
        toolbox: toolbox,
        devices: devices,
        connectors: connectors
      };
    };
    var getText = function() {

      var data = getData();

      var buf = '';
      var print = function(s) {
        buf += s;
      };
      var println = function(s) {
        print(s);
        buf += '\r\n';
      };
      var printArray = function(array) {
        $.each(array, function(i, item) {
          println('    ' + JSON.stringify(item).
                replace(/</g, '\\u003c').replace(/>/g, '\\u003e') +
              (i + 1 < array.length? ',' : '') );
        });
      };
      println('{');
      println('  "width":' + data.width + ',');
      println('  "height":' + data.height + ',');
      println('  "showToolbox":' + data.showToolbox + ',');
      println('  "toolbox":[');
      printArray(data.toolbox);
      println('  ],');
      println('  "devices":[');
      printArray(data.devices);
      println('  ],');
      println('  "connectors":[');
      printArray(data.connectors);
      println('  ]');
      print('}');
      return buf;
    };

    //-------------------------------------------
    // mouse operations

    var dragMoveHandler = null;
    var dragCompleteHandler = null;

    var adjustDevice = function($dev) {
      var pitch = unit / 2;
      var adjust = function(v) { return Math.round(v / pitch) * pitch; };
      var pos = transform($dev);
      var size = controller($dev).getSize();
      var x = Math.max(0, Math.min(pos.x,
          workspaceWidth - toolboxWidth - size.width) );
      var y = Math.max(0, Math.min(pos.y,
          workspaceHeight - size.height) );
      transform($dev, adjust(x), adjust(y) );
    };

    var beginConnect = function(event, $target) {
      var $srcNode = $target.closest('.simcir-node');
      var off = $workspace.offset();
      var pos = offset($srcNode);
      if ($srcNode.attr('simcir-node-type') == 'in') {
        disconnect($srcNode);
      }
      dragMoveHandler = function(event) {
        var x = event.pageX - off.left;
        var y = event.pageY - off.top;
        $temporaryPane.children().remove();
        $temporaryPane.append(createConnector(pos.x, pos.y, x, y) );
      };
      dragCompleteHandler = function(event) {
        $temporaryPane.children().remove();
        var $dst = $(event.target);
        if (isActiveNode($dst) ) {
          var $dstNode = $dst.closest('.simcir-node');
          connect($srcNode, $dstNode);
          updateConnectors();
        }
      };
    };

    var beginNewDevice = function(event, $target) {
      var $dev = $target.closest('.simcir-device');
      var pos = offset($dev);
      $dev = createDevice(controller($dev).deviceDef, false, scope);
      transform($dev, pos.x, pos.y);
      $temporaryPane.append($dev);
      var dragPoint = {
        x: event.pageX - pos.x,
        y: event.pageY - pos.y};
      dragMoveHandler = function(event) {
        transform($dev,
            event.pageX - dragPoint.x,
            event.pageY - dragPoint.y);
      };
      dragCompleteHandler = function(event) {
        var $target = $(event.target);
        if ($target.closest('.simcir-toolbox').length == 0) {
          $dev.detach();
          var pos = transform($dev);
          transform($dev, pos.x - toolboxWidth, pos.y);
          adjustDevice($dev);
          addDevice($dev);
        } else {
          $dev.trigger('dispose');
        }
      };
    };

    var $selectedDevices = [];
    var addSelected = function($dev) {
      controller($dev).setSelected(true);
      $selectedDevices.push($dev);
    };
    var deselectAll = function() {
      $devicePane.children('.simcir-device').each(function() {
        controller($(this) ).setSelected(false);
      });
      $selectedDevices = [];
    };

    var beginMoveDevice = function(event, $target) {
      var $dev = $target.closest('.simcir-device');
      var pos = transform($dev);
      if (!controller($dev).isSelected() ) {
        deselectAll();
        addSelected($dev);
        // to front.
        $dev.parent().append($dev.detach() );
      }

      var dragPoint = {
        x: event.pageX - pos.x,
        y: event.pageY - pos.y};
      dragMoveHandler = function(event) {
        // disable events while dragging.
        enableEvents($dev, false);
        var curPos = transform($dev);
        var deltaPos = {
          x: event.pageX - dragPoint.x - curPos.x,
          y: event.pageY - dragPoint.y - curPos.y};
        $.each($selectedDevices, function(i, $dev) {
          var curPos = transform($dev);
          transform($dev,
              curPos.x + deltaPos.x,
              curPos.y + deltaPos.y);
        });
        updateConnectors();
      };
      dragCompleteHandler = function(event) {
        var $target = $(event.target);
        enableEvents($dev, true);
        $.each($selectedDevices, function(i, $dev) {
          if ($target.closest('.simcir-toolbox').length == 0) {
            adjustDevice($dev);
            updateConnectors();
          } else {
            removeDevice($dev);
          }
        });
      };
    };

    var beginSelectDevice = function(event, $target) {
      var intersect = function(rect1, rect2) {
        return !(
            rect1.x > rect2.x + rect2.width ||
            rect1.y > rect2.y + rect2.height ||
            rect1.x + rect1.width < rect2.x ||
            rect1.y + rect1.height < rect2.y);
      };
      var pointToRect = function(p1, p2) {
        return {
          x: Math.min(p1.x, p2.x),
          y: Math.min(p1.y, p2.y),
          width: Math.abs(p1.x - p2.x),
          height: Math.abs(p1.y - p2.y)};
      };
      deselectAll();
      var off = $workspace.offset();
      var pos = offset($devicePane);
      var p1 = {x: event.pageX - off.left, y: event.pageY - off.top};
      dragMoveHandler = function(event) {
        deselectAll();
        var p2 = {x: event.pageX - off.left, y: event.pageY - off.top};
        var selRect = pointToRect(p1, p2);
        $devicePane.children('.simcir-device').each(function() {
          var $dev = $(this);
          var devPos = transform($dev);
          var devSize = controller($dev).getSize();
          var devRect = {
              x: devPos.x + pos.x,
              y: devPos.y + pos.y,
              width: devSize.width,
              height: devSize.height};
          if (intersect(selRect, devRect) ) {
            addSelected($dev);
          }
        });
        $temporaryPane.children().remove();
        $temporaryPane.append(createSVGElement('rect').
            attr(selRect).
            attr('class', 'simcir-selection-rect') );
      };
    };

    var mouseDownHandler = function(event) {
      event.preventDefault();
      event.stopPropagation();
      var $target = $(event.target);
      if (!data.editable) {
        return;
      }
      if (isActiveNode($target) ) {
        beginConnect(event, $target);
      } else if ($target.closest('.simcir-device').length == 1) {
        if ($target.closest('.simcir-toolbox').length == 1) {
          beginNewDevice(event, $target);
        } else {
          beginMoveDevice(event, $target);
        }
      } else {
        beginSelectDevice(event, $target);
      }
      $(document).on('mousemove', mouseMoveHandler);
      $(document).on('mouseup', mouseUpHandler);
    };
    var mouseMoveHandler = function(event) {
      if (dragMoveHandler != null) {
        dragMoveHandler(event);
      }
    };
    var mouseUpHandler = function(event) {
      if (dragCompleteHandler != null) {
        dragCompleteHandler(event);
      }
      dragMoveHandler = null;
      dragCompleteHandler = null;
      $devicePane.children('.simcir-device').each(function() {
        enableEvents($(this), true);
      });
      $temporaryPane.children().remove();
      $(document).off('mousemove', mouseMoveHandler);
      $(document).off('mouseup', mouseUpHandler);
    };
    $workspace.on('mousedown', mouseDownHandler);

    //-------------------------------------------
    //

    loadToolbox(data);
    $.each(buildCircuit(data, false, scope), function(i, $dev) {
      addDevice($dev);
    });
    updateConnectors();

    controller($workspace, {
      data: getData,
      text: getText
    });

    return $workspace;
  };

  var clearSimcir = function($placeHolder) {
    $placeHolder = $($placeHolder[0]);
    $placeHolder.find('.simcir-workspace').trigger('dispose');
    $placeHolder.children().remove();
    return $placeHolder;
  };

  var setupSimcir = function($placeHolder, data) {

    $placeHolder = clearSimcir($placeHolder);

    var $workspace = simcir.createWorkspace(data);
    var $dataArea = $('<textarea></textarea>').
      addClass('simcir-json-data-area').
      attr('readonly', 'readonly').
      css('width', $workspace.attr('width') + 'px').
      css('height', $workspace.attr('height') + 'px');
    var showData = false;
    var toggle = function() {
      $workspace.css('display', !showData? 'inline' : 'none');
      $dataArea.css('display', showData? 'inline' : 'none');
      if (showData) {
        $dataArea.val(controller($workspace).text() ).focus();
      }
      showData = !showData;
    };
    $placeHolder.text('');
    $placeHolder.append($('<div></div>').
        addClass('simcir-body').
        append($workspace).
        append($dataArea).
        on('click', function(event) {
          if (event.ctrlKey || event.metaKey) {
            toggle();
          }
        }));
    toggle();
    return $placeHolder;
  };

  var setupSimcirDoc = function($placeHolder) {
    var $table = $('<table><tbody></tbody></table>').
      addClass('simcir-doc-table');
    $.each(defaultToolbox, function(i, deviceDef) {
      var $dev = createDevice(deviceDef);
      var device = controller($dev);
      if (!device.doc) {
        return;
      }
      var doc = $.extend({description: '', params: []},device.doc);
      var size = device.getSize();

      var $tr = $('<tr></tr>');
      var hgap = 32;
      var vgap = 8;
      var $view = createSVG(size.width + hgap * 2,
          size.height + vgap * 2 + fontSize);
      var $dev = createDevice(deviceDef);
      transform($dev, hgap, vgap);

      $view.append($dev);
      $tr.append($('<td></td>').css('text-align', 'center').append($view) );
      var $desc = $('<td></td>');
      $tr.append($desc);

      if (doc.description) {
        $desc.append($('<span></span>').
            text(doc.description) );
      }

      $desc.append($('<div>Params</div>').addClass('simcir-doc-title') );
      var $paramsTable = $('<table><tbody></tbody></table>').
        addClass('simcir-doc-params-table');
      $paramsTable.children('tbody').append($('<tr></tr>').
          append($('<th>Name</th>') ).
          append($('<th>Type</th>') ).
          append($('<th>Default</th>') ).
          append($('<th>Description</th>') ) );
      $paramsTable.children('tbody').append($('<tr></tr>').
          append($('<td>type</td>') ).
          append($('<td>string</td>') ).
          append($('<td>-</td>').
              css('text-align', 'center') ).
          append($('<td>"' + deviceDef.type + '"</td>') ) );
      if (!doc.labelless) {
        $paramsTable.children('tbody').append($('<tr></tr>').
            append($('<td>label</td>') ).
            append($('<td>string</td>') ).
            append($('<td>same with type</td>').css('text-align', 'center') ).
            append($('<td>label for a device.</td>') ) );
      }
      if (doc.params) {
        $.each(doc.params, function(i, param) {
          $paramsTable.children('tbody').append($('<tr></tr>').
            append($('<td></td>').text(param.name) ).
            append($('<td></td>').text(param.type) ).
            append($('<td></td>').css('text-align', 'center').
                text(param.defaultValue) ).
            append($('<td></td>').text(param.description) ) );
        });
      }
      $desc.append($paramsTable);

      if (doc.code) {
        $desc.append($('<div>Code</div>').addClass('simcir-doc-title') );
        $desc.append($('<div></div>').
            addClass('simcir-doc-code').text(doc.code) );
      }

      $table.children('tbody').append($tr);
    });

    $placeHolder.append($table);
  };

  $(function() {
    $('.simcir').each(function() {
      var $placeHolder = $(this);
      var text = $placeHolder.text().replace(/^\s+|\s+$/g, '');
      setupSimcir($placeHolder, JSON.parse(text || '{}') );
    });
  });

  $(function() {
    $('.simcir-doc').each(function() {
      setupSimcirDoc($(this) );
    });
  });

  $.extend($s, {
    registerDevice: registerDevice,
    clearSimcir: clearSimcir,
    setupSimcir: setupSimcir,
    createWorkspace: createWorkspace,
    createSVGElement: createSVGElement,
    offset: offset,
    transform: transform,
    enableEvents: enableEvents,
    graphics: graphics,
    controller: controller,
    unit: unit
  });
}(simcir);

//
// built-in devices
//
!function($s) {

  'use strict';

  var $ = $s.$;

  // unit size
  var unit = $s.unit;

  var connectNode = function(in1, out1) {
    // set input value to output without inputValueChange event.
    var in1_super_setValue = in1.setValue;
    in1.setValue = function(value, force) {
      var changed = in1.getValue() !== value;
      in1_super_setValue(value, force);
      if (changed || force) {
        out1.setValue(in1.getValue() );
      }
    };
  };

  var createPortFactory = function(type) {
    return function(device) {
      var in1 = device.addInput();
      var out1 = device.addOutput();
      connectNode(in1, out1);
      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();
        var size = device.getSize();
        var cx = size.width / 2;
        var cy = size.height / 2;
        device.$ui.append($s.createSVGElement('circle').
          attr({cx: cx, cy: cy, r: unit / 2}).
          attr('class', 'simcir-port simcir-node-type-' + type) );
        device.$ui.append($s.createSVGElement('circle').
          attr({cx: cx, cy: cy, r: unit / 4}).
          attr('class', 'simcir-port-hole') );
      };
    };
  };

  var createJointFactory = function() {

    var maxFadeCount = 16;
    var fadeTimeout = 100;

    var Direction = { WE : 0, NS : 1, EW : 2, SN : 3 };

    return function(device) {

      var in1 = device.addInput();
      var out1 = device.addOutput();
      connectNode(in1, out1);

      var state = device.deviceDef.state || { direction : Direction.WE };
      device.getState = function() {
        return state;
      };

      device.getSize = function() {
        return { width : unit, height : unit };
      };

      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();

        var $label = device.$ui.children('.simcir-device-label');
        $label.attr('y', $label.attr('y') - unit / 4);

        var $point = $s.createSVGElement('circle').
          css('pointer-events', 'none').css('opacity', 0).attr('r', 2).
          addClass('simcir-connector').addClass('simcir-joint-point');
        device.$ui.append($point);

        var $path = $s.createSVGElement('path').
          css('pointer-events', 'none').css('opacity', 0).
          addClass('simcir-connector');
        device.$ui.append($path);

        var $title = $s.createSVGElement('title').
          text('Double-Click to change a direction.');

        var updatePoint = function() {
          $point.css('display', out1.getInputs().length > 1? '' : 'none');
        };

        updatePoint();

        var super_connectTo = out1.connectTo;
        out1.connectTo = function(inNode) {
          super_connectTo(inNode);
          updatePoint();
        };
        var super_disconnectFrom = out1.disconnectFrom;
        out1.disconnectFrom = function(inNode) {
          super_disconnectFrom(inNode);
          updatePoint();
        };

        var updateUI = function() {
          var x0, y0, x1, y1;
          x0 = y0 = x1 = y1 = unit / 2;
          var d = unit / 2;
          var direction = state.direction;
          if (direction == Direction.WE) {
            x0 -= d;
            x1 += d;
          } else if (direction == Direction.NS) {
            y0 -= d;
            y1 += d;
          } else if (direction == Direction.EW) {
            x0 += d;
            x1 -= d;
          } else if (direction == Direction.SN) {
            y0 += d;
            y1 -= d;
          }
          $path.attr('d', 'M' + x0 + ' ' + y0 + 'L' + x1 + ' ' + y1);
          $s.transform(in1.$ui, x0, y0);
          $s.transform(out1.$ui, x1, y1);
          $point.attr({cx : x1, cy : y1});
          if (direction == Direction.EW || direction == Direction.WE) {
            device.$ui.children('.simcir-device-body').
              attr({x: 0, y: unit / 4, width: unit, height: unit / 2});
          } else {
            device.$ui.children('.simcir-device-body').
              attr({x: unit / 4, y: 0, width: unit / 2, height: unit});
          }
        };

        updateUI();

        // fadeout a body.
        var fadeCount = 0;
        var setOpacity = function(opacity) {
          device.$ui.children('.simcir-device-body,.simcir-node').
            css('opacity', opacity);
          $path.css('opacity', 1 - opacity);
          $point.css('opacity', 1 - opacity);
        };
        var fadeout = function() {
          window.setTimeout(function() {
            if (fadeCount > 0) {
              fadeCount -= 1;
              setOpacity(fadeCount / maxFadeCount);
              fadeout();
            }
          }, fadeTimeout);
        };

        var isEditable = function($dev) {
          var $workspace = $dev.closest('.simcir-workspace');
          return !!$s.controller($workspace).data().editable;
        };
        var device_mouseoutHandler = function(event) {
          if (!isEditable($(event.target) ) ) {
            return;
          }
          if (!device.isSelected() ) {
            fadeCount = maxFadeCount;
            fadeout();
          }
        };
        var device_dblclickHandler = function(event) {
          if (!isEditable($(event.target) ) ) {
            return;
          }
          state.direction = (state.direction + 1) % 4;
          updateUI();
          // update connectors.
          $(this).trigger('mousedown').trigger('mouseup');
        };

        device.$ui.on('mouseover', function(event) {
            if (!isEditable($(event.target) ) ) {
              $title.text('');
              return;
            }
            setOpacity(1);
            fadeCount = 0;
          }).on('deviceAdd', function() {
            if ($(this).closest('BODY').length == 0) {
              setOpacity(0);
            }
            $(this).append($title).on('mouseout', device_mouseoutHandler).
              on('dblclick', device_dblclickHandler);
            // hide a label
            $label.css('display', 'none');
          }).on('deviceRemove', function() {
            $(this).off('mouseout', device_mouseoutHandler).
              off('dblclick', device_dblclickHandler);
            $title.remove();
            // show a label
            $label.css('display', '');
          }).on('deviceSelect', function() {
            if (device.isSelected() ) {
              setOpacity(1);
              fadeCount = 0;
            } else {
              if (fadeCount == 0) {
                setOpacity(0);
              }
            }
          });
      };
    };
  };

  // register built-in devices
  $s.registerDevice('In', createPortFactory('in') );
  $s.registerDevice('Out', createPortFactory('out') );
  $s.registerDevice('Joint', createJointFactory() );

}(simcir);
//
// SimcirJS - basicset
//
// Copyright (c) 2014 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

// includes following device types:
//  DC
//  LED
//  PushOff
//  PushOn
//  Toggle
//  BUF
//  NOT
//  AND
//  NAND
//  OR
//  NOR
//  EOR
//  ENOR
//  OSC
//  7seg
//  16seg
//  4bit7seg
//  RotaryEncoder
//  BusIn
//  BusOut

!function($s) {

  'use strict';

  var $ = $s.$;

  // unit size
  var unit = $s.unit;

  // red/black
  var defaultLEDColor = '#00ff00';
  var defaultLEDBgColor = '#000000';

  var multiplyColor = function() {
    var HEX = '0123456789abcdef';
    var toIColor = function(sColor) {
      if (!sColor) {
        return 0;
      }
      sColor = sColor.toLowerCase();
      if (sColor.match(/^#[0-9a-f]{3}$/i) ) {
        var iColor = 0;
        for (var i = 0; i < 6; i += 1) {
          iColor = (iColor << 4) | HEX.indexOf(sColor.charAt( (i >> 1) + 1) );
        }
        return iColor;
      } else if (sColor.match(/^#[0-9a-f]{6}$/i) ) {
        var iColor = 0;
        for (var i = 0; i < 6; i += 1) {
          iColor = (iColor << 4) | HEX.indexOf(sColor.charAt(i + 1) );
        }
        return iColor;
      }
      return 0;
    };
    var toSColor = function(iColor) {
      var sColor = '#';
      for (var i = 0; i < 6; i += 1) {
        sColor += HEX.charAt( (iColor >>> (5 - i) * 4) & 0x0f);
      }
      return sColor;
    };
    var toRGB = function(iColor) {
      return {
        r: (iColor >>> 16) & 0xff,
        g: (iColor >>> 8) & 0xff,
        b: iColor & 0xff};
    };
    var multiplyColor = function(iColor1, iColor2, ratio) {
      var c1 = toRGB(iColor1);
      var c2 = toRGB(iColor2);
      var mc = function(v1, v2, ratio) {
        return ~~Math.max(0, Math.min( (v1 - v2) * ratio + v2, 255) );
      };
      return (mc(c1.r, c2.r, ratio) << 16) |
        (mc(c1.g, c2.g, ratio) << 8) | mc(c1.b, c2.b, ratio);
    };
    return function(color1, color2, ratio) {
      return toSColor(multiplyColor(
          toIColor(color1), toIColor(color2), ratio) );
    };
  }();

  // symbol draw functions
  var drawBUF = function(g, x, y, width, height) {
    g.moveTo(x, y);
    g.lineTo(x + width, y + height / 2);
    g.lineTo(x, y + height);
    g.lineTo(x, y);
    g.closePath(true);
  };
  var drawAND = function(g, x, y, width, height) {
    g.moveTo(x, y);
    g.curveTo(x + width, y, x + width, y + height / 2);
    g.curveTo(x + width, y + height, x, y + height);
    g.lineTo(x, y);
    g.closePath(true);
  };
  var drawOR = function(g, x, y, width, height) {
    var depth = width * 0.2;
    g.moveTo(x, y);
    g.curveTo(x + width - depth, y, x + width, y + height / 2);
    g.curveTo(x + width - depth, y + height, x, y + height);
    g.curveTo(x + depth, y + height, x + depth, y + height / 2);
    g.curveTo(x + depth, y, x, y);
    g.closePath(true);
  };
  var drawEOR = function(g, x, y, width, height) {
    drawOR(g, x + 3, y, width - 3, height);
    var depth = (width - 3) * 0.2;
    g.moveTo(x, y + height);
    g.curveTo(x + depth, y + height, x + depth, y + height / 2);
    g.curveTo(x + depth, y, x, y);
    g.closePath();
  };
  var drawNOT = function(g, x, y, width, height) {
    drawBUF(g, x - 1, y, width - 2, height);
    g.drawCircle(x + width - 1, y + height / 2, 2);
  };
  var drawNAND = function(g, x, y, width, height) {
    drawAND(g, x - 1, y, width - 2, height);
    g.drawCircle(x + width - 1, y + height / 2, 2);
  };
  var drawNOR = function(g, x, y, width, height) {
    drawOR(g, x - 1, y, width - 2, height);
    g.drawCircle(x + width - 1, y + height / 2, 2);
  };
  var drawENOR = function(g, x, y, width, height) {
    drawEOR(g, x - 1, y, width - 2, height);
    g.drawCircle(x + width - 1, y + height / 2, 2);
  };
  // logical functions
  var AND = function(a, b) { return a & b; };
  var OR = function(a, b) { return a | b; };
  var EOR = function(a, b) { return a ^ b; };
  var BUF = function(a) { return (a == 1)? 1 : 0; };
  var NOT = function(a) { return (a == 1)? 0 : 1; };

  var onValue = 1;
  var offValue = null;
  var isHot = function(v) { return v != null; };
  var intValue = function(v) { return isHot(v)? 1 : 0; };

  var createSwitchFactory = function(type) {
    return function(device) {
      var in1 = device.addInput();
      var out1 = device.addOutput();
      var on = (type == 'PushOff');

      if (type == 'Toggle' && device.deviceDef.state) {
        on = device.deviceDef.state.on;
      }
      device.getState = function() {
        return type == 'Toggle'? { on : on } : null;
      };

      device.$ui.on('inputValueChange', function() {
        if (on) {
          out1.setValue(in1.getValue() );
        }
      });
      var updateOutput = function() {
        out1.setValue(on? in1.getValue() : null);
      };
      updateOutput();

      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();
        var size = device.getSize();
        var $button = $s.createSVGElement('rect').
          attr({x: size.width / 4, y: size.height / 4,
            width: size.width / 2, height: size.height / 2,
            rx: 2, ry: 2});
        $button.addClass('simcir-basicset-switch-button');
        if (type == 'Toggle' && on) {
          $button.addClass('simcir-basicset-switch-button-pressed');
        }
        device.$ui.append($button);
        var button_mouseDownHandler = function(event) {
          event.preventDefault();
          event.stopPropagation();
          if (type == 'PushOn') {
            on = true;
            $button.addClass('simcir-basicset-switch-button-pressed');
          } else if (type == 'PushOff') {
            on = false;
            $button.addClass('simcir-basicset-switch-button-pressed');
          } else if (type == 'Toggle') {
            on = !on;
            $button.addClass('simcir-basicset-switch-button-pressed');
          }
          updateOutput();
          $(document).on('mouseup', button_mouseUpHandler);
          $(document).on('touchend', button_mouseUpHandler);
        };
        var button_mouseUpHandler = function(event) {
          if (type == 'PushOn') {
            on = false;
            $button.removeClass('simcir-basicset-switch-button-pressed');
          } else if (type == 'PushOff') {
            on = true;
            $button.removeClass('simcir-basicset-switch-button-pressed');
          } else if (type == 'Toggle') {
            // keep state
            if (!on) {
              $button.removeClass('simcir-basicset-switch-button-pressed');
            }
          }
          updateOutput();
          $(document).off('mouseup', button_mouseUpHandler);
          $(document).off('touchend', button_mouseUpHandler);
        };
        device.$ui.on('deviceAdd', function() {
          $s.enableEvents($button, true);
          $button.on('mousedown', button_mouseDownHandler);
          $button.on('touchstart', button_mouseDownHandler);
        });
        device.$ui.on('deviceRemove', function() {
          $s.enableEvents($button, false);
          $button.off('mousedown', button_mouseDownHandler);
          $button.off('touchstart', button_mouseDownHandler);
        });
        device.$ui.addClass('simcir-basicset-switch');
      };
    };
  };

  var createLogicGateFactory = function(op, out, draw) {
    return function(device) {
      var numInputs = (op == null)? 1 :
        Math.max(2, device.deviceDef.numInputs || 2);
      device.halfPitch = numInputs > 2;
      for (var i = 0; i < numInputs; i += 1) {
        device.addInput();
      }
      device.addOutput();
      var inputs = device.getInputs();
      var outputs = device.getOutputs();
      device.$ui.on('inputValueChange', function() {
        var b = intValue(inputs[0].getValue() );
        if (op != null) {
          for (var i = 1; i < inputs.length; i += 1) {
            b = op(b, intValue(inputs[i].getValue() ) );
          }
        }
        b = out(b);
        outputs[0].setValue( (b == 1)? 1 : null);
      });
      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();
        var size = device.getSize();
        var g = $s.graphics(device.$ui);
        g.attr['class'] = 'simcir-basicset-symbol';
        draw(g, 
          (size.width - unit) / 2,
          (size.height - unit) / 2,
          unit, unit);
        if (op != null) {
          device.doc = {
            params: [
              {name: 'numInputs', type: 'number',
                defaultValue: 2,
                description: 'number of inputs.'}
            ],
            code: '{"type":"' + device.deviceDef.type + '","numInputs":2}'
          };
        }
      };
    };
  };

  /*
  var segBase = function() {
    return {
      width: 0,
      height: 0,
      allSegments: '',
      drawSegment: function(g, segment, color) {},
      drawPoint: function(g, color) {}
    };
  };
  */

  var _7Seg = function() {
    var _SEGMENT_DATA = {
      a: [575, 138, 494, 211, 249, 211, 194, 137, 213, 120, 559, 120],
      b: [595, 160, 544, 452, 493, 500, 459, 456, 500, 220, 582, 146],
      c: [525, 560, 476, 842, 465, 852, 401, 792, 441, 562, 491, 516],
      d: [457, 860, 421, 892, 94, 892, 69, 864, 144, 801, 394, 801],
      e: [181, 560, 141, 789, 61, 856, 48, 841, 96, 566, 148, 516],
      f: [241, 218, 200, 453, 150, 500, 115, 454, 166, 162, 185, 145],
      g: [485, 507, 433, 555, 190, 555, 156, 509, 204, 464, 451, 464]
    };
    return {
      width: 636,
      height: 1000,
      allSegments: 'abcdefg',
      drawSegment: function(g, segment, color) {
        if (!color) {
          return;
        }
        var data = _SEGMENT_DATA[segment];
        var numPoints = data.length / 2;
        g.attr['fill'] = color;
        for (var i = 0; i < numPoints; i += 1) {
          var x = data[i * 2];
          var y = data[i * 2 + 1];
          if (i == 0) {
            g.moveTo(x, y);
          } else {
            g.lineTo(x, y);
          }
        }
        g.closePath(true);
      },
      drawPoint: function(g, color) {
        if (!color) {
          return;
        }
        g.attr['fill'] = color;
        g.drawCircle(542, 840, 46);
      }
    };
  }();

  var _16Seg = function() {
    var _SEGMENT_DATA = {
      a: [255, 184, 356, 184, 407, 142, 373, 102, 187, 102],
      b: [418, 144, 451, 184, 552, 184, 651, 102, 468, 102],
      c: [557, 190, 507, 455, 540, 495, 590, 454, 656, 108],
      d: [487, 550, 438, 816, 506, 898, 573, 547, 539, 507],
      e: [281, 863, 315, 903, 500, 903, 432, 821, 331, 821],
      f: [35, 903, 220, 903, 270, 861, 236, 821, 135, 821],
      g: [97, 548, 30, 897, 129, 815, 180, 547, 147, 507],
      h: [114, 455, 148, 495, 198, 454, 248, 189, 181, 107],
      i: [233, 315, 280, 452, 341, 493, 326, 331, 255, 200],
      j: [361, 190, 334, 331, 349, 485, 422, 312, 445, 189, 412, 149],
      k: [430, 316, 354, 492, 432, 452, 522, 334, 547, 200],
      l: [354, 502, 408, 542, 484, 542, 534, 500, 501, 460, 434, 460],
      m: [361, 674, 432, 805, 454, 691, 405, 550, 351, 509],
      n: [265, 693, 242, 816, 276, 856, 326, 815, 353, 676, 343, 518],
      o: [255, 546, 165, 671, 139, 805, 258, 689, 338, 510],
      p: [153, 502, 187, 542, 254, 542, 338, 500, 278, 460, 203, 460]
    };
    return {
      width: 690,
      height: 1000,
      allSegments: 'abcdefghijklmnop',
      drawSegment: function(g, segment, color) {
        if (!color) {
          return;
        }
        var data = _SEGMENT_DATA[segment];
        var numPoints = data.length / 2;
        g.attr['fill'] = color;
        for (var i = 0; i < numPoints; i += 1) {
          var x = data[i * 2];
          var y = data[i * 2 + 1];
          if (i == 0) {
            g.moveTo(x, y);
          } else {
            g.lineTo(x, y);
          }
        }
        g.closePath(true);
      },
      drawPoint: function(g, color) {
        if (!color) {
          return;
        }
        g.attr['fill'] = color;
        g.drawCircle(610, 900, 30);
      }
    };
  }();

  var drawSeg = function(seg, g, pattern, hiColor, loColor, bgColor) {
    g.attr['stroke'] = 'none';
    if (bgColor) {
      g.attr['fill'] = bgColor;
      g.drawRect(0, 0, seg.width, seg.height);
    }
    var on;
    for (var i = 0; i < seg.allSegments.length; i += 1) {
      var c = seg.allSegments.charAt(i);
      on = (pattern != null && pattern.indexOf(c) != -1);
      seg.drawSegment(g, c, on? hiColor : loColor);
    }
    on = (pattern != null && pattern.indexOf('.') != -1);
    seg.drawPoint(g, on? hiColor : loColor);
  };

  var createSegUI = function(device, seg) {
    var size = device.getSize();
    var sw = seg.width;
    var sh = seg.height;
    var dw = size.width - unit;
    var dh = size.height - unit;
    var scale = (sw / sh > dw / dh)? dw / sw : dh / sh;
    var tx = (size.width - seg.width * scale) / 2;
    var ty = (size.height - seg.height * scale) / 2;
    return $s.createSVGElement('g').
      attr('transform', 'translate(' + tx + ' ' + ty + ')' +
          ' scale(' + scale + ') ');
  };

  var createLEDSegFactory = function(seg) {
    return function(device) {
      var hiColor = device.deviceDef.color || defaultLEDColor;
      var bgColor = device.deviceDef.bgColor || defaultLEDBgColor;
      var loColor = multiplyColor(hiColor, bgColor, 0.25);
      var allSegs = seg.allSegments + '.';
      device.halfPitch = true;
      for (var i = 0; i < allSegs.length; i += 1) {
        device.addInput();
      }

      var super_getSize = device.getSize;
      device.getSize = function() {
        var size = super_getSize();
        return {width: unit * 4, height: size.height};
      };

      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();

        var $seg = createSegUI(device, seg);
        device.$ui.append($seg);

        var update = function() {
          var segs = '';
          for (var i = 0; i < allSegs.length; i += 1) {
            if (isHot(device.getInputs()[i].getValue() ) ) {
              segs += allSegs.charAt(i);
            }
          }
          $seg.children().remove();
          drawSeg(seg, $s.graphics($seg), segs,
              hiColor, loColor, bgColor);
        };
        device.$ui.on('inputValueChange', update);
        update();
        device.doc = {
          params: [
            {name: 'color', type: 'string',
              defaultValue: defaultLEDColor,
              description: 'color in hexadecimal.'},
            {name: 'bgColor', type: 'string',
              defaultValue: defaultLEDBgColor,
              description: 'background color in hexadecimal.'}
          ],
          code: '{"type":"' + device.deviceDef.type +
          '","color":"' + defaultLEDColor + '"}'
        };
      };
    };
  };

  var createLED4bitFactory = function() {

    var _PATTERNS = {
      0: 'abcdef',
      1: 'bc',
      2: 'abdeg',
      3: 'abcdg',
      4: 'bcfg',
      5: 'acdfg',
      6: 'acdefg',
      7: 'abc',
      8: 'abcdefg',
      9: 'abcdfg', 
      a: 'abcefg',
      b: 'cdefg',
      c: 'adef',
      d: 'bcdeg',
      e: 'adefg',
      f: 'aefg'
    };

    var getPattern = function(value) {
      return _PATTERNS['0123456789abcdef'.charAt(value)];
    };

    var seg = _7Seg;

    return function(device) {
      var hiColor = device.deviceDef.color || defaultLEDColor;
      var bgColor = device.deviceDef.bgColor || defaultLEDBgColor;
      var loColor = multiplyColor(hiColor, bgColor, 0.25);
      for (var i = 0; i < 4; i += 1) {
        device.addInput();
      }

      var super_getSize = device.getSize;
      device.getSize = function() {
        var size = super_getSize();
        return {width: unit * 4, height: size.height};
      };

      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();

        var $seg = createSegUI(device, seg);
        device.$ui.append($seg);
  
        var update = function() {
          var value = 0;
          for (var i = 0; i < 4; i += 1) {
            if (isHot(device.getInputs()[i].getValue() ) ) {
              value += (1 << i);
            }
          }
          $seg.children().remove();
          drawSeg(seg, $s.graphics($seg), getPattern(value),
              hiColor, loColor, bgColor);
        };
        device.$ui.on('inputValueChange', update);
        update();
        device.doc = {
          params: [
            {name: 'color', type: 'string',
              defaultValue: defaultLEDColor,
              description: 'color in hexadecimal.'},
            {name: 'bgColor', type: 'string',
              defaultValue: defaultLEDBgColor,
              description: 'background color in hexadecimal.'}
          ],
          code: '{"type":"' + device.deviceDef.type +
          '","color":"' + defaultLEDColor + '"}'
        };
      };
    };
  };

  var createRotaryEncoderFactory = function() {
    var _MIN_ANGLE = 45;
    var _MAX_ANGLE = 315;
    var thetaToAngle = function(theta) {
      var angle = (theta - Math.PI / 2) / Math.PI * 180;
      while (angle < 0) {
        angle += 360;
      }
      while (angle > 360) {
        angle -= 360;
      }
      return angle;
    };
    return function(device) {
      var numOutputs = Math.max(2, device.deviceDef.numOutputs || 4);
      device.halfPitch = numOutputs > 4;
      device.addInput();
      for (var i = 0; i < numOutputs; i += 1) {
        device.addOutput();
      }

      var super_getSize = device.getSize;
      device.getSize = function() {
        var size = super_getSize();
        return {width: unit * 4, height: size.height};
      };

      var super_createUI = device.createUI;
      device.createUI = function() {
        super_createUI();
        var size = device.getSize();
        
        var $knob = $s.createSVGElement('g').
          attr('class', 'simcir-basicset-knob').
          append($s.createSVGElement('rect').
              attr({x:-10,y:-10,width:20,height:20}));
        var r = Math.min(size.width, size.height) / 4 * 1.5;
        var g = $s.graphics($knob);
        g.drawCircle(0, 0, r);
        g.attr['class'] = 'simcir-basicset-knob-mark';
        g.moveTo(0, 0);
        g.lineTo(r, 0);
        g.closePath();
        device.$ui.append($knob);
  
        var _angle = _MIN_ANGLE;
        var setAngle = function(angle) {
          _angle = Math.max(_MIN_ANGLE, Math.min(angle, _MAX_ANGLE) );
          update();
        };
  
        var dragPoint = null;
        var knob_mouseDownHandler = function(event) {
          event.preventDefault();
          event.stopPropagation();
          dragPoint = {x: event.pageX, y: event.pageY};
          $(document).on('mousemove', knob_mouseMoveHandler);
          $(document).on('mouseup', knob_mouseUpHandler);
        };
        var knob_mouseMoveHandler = function(event) {
          var off = $knob.parent('svg').offset();
          var pos = $s.offset($knob);
          var cx = off.left + pos.x;
          var cy = off.top + pos.y;
          var dx = event.pageX - cx;
          var dy = event.pageY - cy;
          if (dx == 0 && dy == 0) return;
          setAngle(thetaToAngle(Math.atan2(dy, dx) ) );
        };
        var knob_mouseUpHandler = function(event) {
          $(document).off('mousemove', knob_mouseMoveHandler);
          $(document).off('mouseup', knob_mouseUpHandler);
        };
        device.$ui.on('deviceAdd', function() {
          $s.enableEvents($knob, true);
          $knob.on('mousedown', knob_mouseDownHandler);
        });
        device.$ui.on('deviceRemove', function() {
          $s.enableEvents($knob, false);
          $knob.off('mousedown', knob_mouseDownHandler);
        });
  
        var update = function() {
          $s.transform($knob, size.width / 2,
              size.height / 2, _angle + 90);
          var max = 1 << numOutputs;
          var value = Math.min( ( (_angle - _MIN_ANGLE) /
              (_MAX_ANGLE - _MIN_ANGLE) * max), max - 1);
          for (var i = 0; i < numOutputs; i += 1) {
            device.getOutputs()[i].setValue( (value & (1 << i) )?
                device.getInputs()[0].getValue() : null);
          }
        };
        device.$ui.on('inputValueChange', update);
        update();
        device.doc = {
          params: [
            {name: 'numOutputs', type: 'number', defaultValue: 4,
              description: 'number of outputs.'}
          ],
          code: '{"type":"' + device.deviceDef.type + '","numOutputs":4}'
        };
      };
    };
  };

  // register direct current source
  $s.registerDevice('DC', function(device) {
    device.addOutput();
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      device.$ui.addClass('simcir-basicset-dc');
    };
    device.$ui.on('deviceAdd', function() {
      device.getOutputs()[0].setValue(onValue);
    });
    device.$ui.on('deviceRemove', function() {
      device.getOutputs()[0].setValue(null);
    });
  });

  // register simple LED
  $s.registerDevice('LED', function(device) {
    var in1 = device.addInput();
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      var hiColor = device.deviceDef.color || defaultLEDColor;
      var bgColor = device.deviceDef.bgColor || defaultLEDBgColor;
      var loColor = multiplyColor(hiColor, bgColor, 0.25);
      var bLoColor = multiplyColor(hiColor, bgColor, 0.2);
      var bHiColor = multiplyColor(hiColor, bgColor, 0.8);
      var size = device.getSize();
      var $ledbase = $s.createSVGElement('circle').
        attr({cx: size.width / 2, cy: size.height / 2, r: size.width / 4}).
        attr('stroke', 'none').
        attr('fill', bLoColor);
      device.$ui.append($ledbase);
      var $led = $s.createSVGElement('circle').
        attr({cx: size.width / 2, cy: size.height / 2, r: size.width / 4 * 0.8}).
        attr('stroke', 'none').
        attr('fill', loColor);
      device.$ui.append($led);
      device.$ui.on('inputValueChange', function() {
        $ledbase.attr('fill', isHot(in1.getValue() )? bHiColor : bLoColor);
        $led.attr('fill', isHot(in1.getValue() )? hiColor : loColor);
      });
      device.doc = {
        params: [
          {name: 'color', type: 'string',
            defaultValue: defaultLEDColor,
            description: 'color in hexadecimal.'},
          {name: 'bgColor', type: 'string',
            defaultValue: defaultLEDBgColor,
            description: 'background color in hexadecimal.'}
        ],
        code: '{"type":"' + device.deviceDef.type +
        '","color":"' + defaultLEDColor + '"}'
      };
    };
  });

  // register switches
  $s.registerDevice('PushOff', createSwitchFactory('PushOff') );
  $s.registerDevice('PushOn', createSwitchFactory('PushOn') );
  $s.registerDevice('Toggle', createSwitchFactory('Toggle') );

  // register logic gates
  $s.registerDevice('BUF', createLogicGateFactory(null, BUF, drawBUF) );
  $s.registerDevice('NOT', createLogicGateFactory(null, NOT, drawNOT) );
  $s.registerDevice('AND', createLogicGateFactory(AND, BUF, drawAND) );
  $s.registerDevice('NAND', createLogicGateFactory(AND, NOT, drawNAND) );
  $s.registerDevice('OR', createLogicGateFactory(OR, BUF, drawOR) );
  $s.registerDevice('NOR', createLogicGateFactory(OR, NOT, drawNOR) );
  $s.registerDevice('XOR', createLogicGateFactory(EOR, BUF, drawEOR) );
  $s.registerDevice('XNOR', createLogicGateFactory(EOR, NOT, drawENOR) );
  // deprecated. not displayed in the default toolbox.
  $s.registerDevice('EOR', createLogicGateFactory(EOR, BUF, drawEOR), true);
  $s.registerDevice('ENOR', createLogicGateFactory(EOR, NOT, drawENOR), true);

  // register Oscillator
  $s.registerDevice('OSC', function(device) {
    var freq = device.deviceDef.freq || 10;
    var delay = ~~(500 / freq);
    var out1 = device.addOutput();
    var timerId = null;
    var on = false;
    device.$ui.on('deviceAdd', function() {
      timerId = window.setInterval(function() {
        out1.setValue(on? onValue : offValue);
        on = !on;
      }, delay);
    });
    device.$ui.on('deviceRemove', function() {
      if (timerId != null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    });
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      device.$ui.addClass('simcir-basicset-osc');
      device.doc = {
        params: [
          {name: 'freq', type: 'number', defaultValue: '10',
            description: 'frequency of an oscillator.'}
        ],
        code: '{"type":"' + device.deviceDef.type + '","freq":10}'
      };
    };
  });

  // register LED seg
  $s.registerDevice('7seg', createLEDSegFactory(_7Seg) );
  $s.registerDevice('16seg', createLEDSegFactory(_16Seg) );
  $s.registerDevice('4bit7seg', createLED4bitFactory() );

  // register Rotary Encoder
  $s.registerDevice('RotaryEncoder', createRotaryEncoderFactory() );

  $s.registerDevice('BusIn', function(device) {
    var numOutputs = Math.max(2, device.deviceDef.numOutputs || 8);
    device.halfPitch = true;
    device.addInput('', 'x' + numOutputs);
    for (var i = 0; i < numOutputs; i += 1) {
      device.addOutput();
    }
    var extractValue = function(busValue, i) {
      return (busValue != null && typeof busValue == 'object' &&
          typeof busValue[i] != 'undefined')? busValue[i] : null;
    };
    device.$ui.on('inputValueChange', function() {
      var busValue = device.getInputs()[0].getValue();
      for (var i = 0; i < numOutputs; i += 1) {
        device.getOutputs()[i].setValue(extractValue(busValue, i) );
      }
    });
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      device.doc = {
        params: [
          {name: 'numOutputs', type: 'number', defaultValue: 8,
            description: 'number of outputs.'}
        ],
        code: '{"type":"' + device.deviceDef.type + '","numOutputs":8}'
      };
    };
  });

  $s.registerDevice('BusOut', function(device) {
    var numInputs = Math.max(2, device.deviceDef.numInputs || 8);
    device.halfPitch = true;
    for (var i = 0; i < numInputs; i += 1) {
      device.addInput();
    }
    device.addOutput('', 'x' + numInputs);
    device.$ui.on('inputValueChange', function() {
      var busValue = [];
      var hotCount = 0;
      for (var i = 0; i < numInputs; i += 1) {
        var value = device.getInputs()[i].getValue();
        if (isHot(value) ) {
          hotCount += 1;
        }
        busValue.push(value);
      }
      device.getOutputs()[0].setValue(
          (hotCount > 0)? busValue : null);
    });
    var super_createUI = device.createUI;
    device.createUI = function() {
      super_createUI();
      device.doc = {
        params: [
          {name: 'numInputs', type: 'number', defaultValue: 8,
            description: 'number of inputs.'}
        ],
        code: '{"type":"' + device.deviceDef.type + '","numInputs":8}'
      };
    };
  });

}(simcir);
//
// SimcirJS - library
//
// Copyright (c) 2014 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//

// includes following device types:
//  RS-FF
//  JK-FF
//  T-FF
//  D-FF
//  8bitCounter
//  HalfAdder
//  FullAdder
//  4bitAdder
//  2to4BinaryDecoder
//  3to8BinaryDecoder
//  4to16BinaryDecoder

simcir.registerDevice('RS-FF',
{
  "width":320,
  "height":160,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"NAND","id":"dev0","x":184,"y":32,"label":"NAND"},
    {"type":"NAND","id":"dev1","x":184,"y":80,"label":"NAND"},
    {"type":"In","id":"dev2","x":136,"y":24,"label":"~S"},
    {"type":"In","id":"dev3","x":136,"y":88,"label":"~R"},
    {"type":"Out","id":"dev4","x":232,"y":32,"label":"Q"},
    {"type":"Out","id":"dev5","x":232,"y":80,"label":"~Q"},
    {"type":"PushOff","id":"dev6","x":88,"y":24,"label":"PushOff"},
    {"type":"PushOff","id":"dev7","x":88,"y":88,"label":"PushOff"},
    {"type":"DC","id":"dev8","x":40,"y":56,"label":"DC"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev2.out0"},
    {"from":"dev0.in1","to":"dev1.out0"},
    {"from":"dev1.in0","to":"dev0.out0"},
    {"from":"dev1.in1","to":"dev3.out0"},
    {"from":"dev2.in0","to":"dev6.out0"},
    {"from":"dev3.in0","to":"dev7.out0"},
    {"from":"dev4.in0","to":"dev0.out0"},
    {"from":"dev5.in0","to":"dev1.out0"},
    {"from":"dev6.in0","to":"dev8.out0"},
    {"from":"dev7.in0","to":"dev8.out0"}
  ]
}
);

simcir.registerDevice('JK-FF',
{
  "width":480,
  "height":240,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"RS-FF","id":"dev0","x":216,"y":112,"label":"RS-FF"},
    {"type":"RS-FF","id":"dev1","x":344,"y":112,"label":"RS-FF"},
    {"type":"NAND","numInputs":3,"id":"dev2","x":168,"y":80,"label":"NAND"},
    {"type":"NAND","numInputs":3,"id":"dev3","x":168,"y":144,"label":"NAND"},
    {"type":"NAND","id":"dev4","x":296,"y":80,"label":"NAND"},
    {"type":"NAND","id":"dev5","x":296,"y":144,"label":"NAND"},
    {"type":"NOT","id":"dev6","x":168,"y":24,"label":"NOT"},
    {"type":"In","id":"dev7","x":120,"y":64,"label":"J"},
    {"type":"In","id":"dev8","x":120,"y":112,"label":"CLK"},
    {"type":"In","id":"dev9","x":120,"y":160,"label":"K"},
    {"type":"Out","id":"dev10","x":424,"y":80,"label":"Q"},
    {"type":"Out","id":"dev11","x":424,"y":144,"label":"~Q"},
    {"type":"Toggle","id":"dev12","x":72,"y":64,"label":"Toggle"},
    {"type":"PushOn","id":"dev13","x":72,"y":112,"label":"PushOn"},
    {"type":"Toggle","id":"dev14","x":72,"y":160,"label":"Toggle"},
    {"type":"DC","id":"dev15","x":24,"y":112,"label":"DC"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev2.out0"},
    {"from":"dev0.in1","to":"dev3.out0"},
    {"from":"dev1.in0","to":"dev4.out0"},
    {"from":"dev1.in1","to":"dev5.out0"},
    {"from":"dev2.in0","to":"dev1.out1"},
    {"from":"dev2.in1","to":"dev7.out0"},
    {"from":"dev2.in2","to":"dev8.out0"},
    {"from":"dev3.in0","to":"dev8.out0"},
    {"from":"dev3.in1","to":"dev9.out0"},
    {"from":"dev3.in2","to":"dev1.out0"},
    {"from":"dev4.in0","to":"dev6.out0"},
    {"from":"dev4.in1","to":"dev0.out0"},
    {"from":"dev5.in0","to":"dev0.out1"},
    {"from":"dev5.in1","to":"dev6.out0"},
    {"from":"dev6.in0","to":"dev8.out0"},
    {"from":"dev7.in0","to":"dev12.out0"},
    {"from":"dev8.in0","to":"dev13.out0"},
    {"from":"dev9.in0","to":"dev14.out0"},
    {"from":"dev10.in0","to":"dev1.out0"},
    {"from":"dev11.in0","to":"dev1.out1"},
    {"from":"dev12.in0","to":"dev15.out0"},
    {"from":"dev13.in0","to":"dev15.out0"},
    {"from":"dev14.in0","to":"dev15.out0"}
  ]
}
);

simcir.registerDevice('T-FF',
{
  "width":320,
  "height":160,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"JK-FF","id":"dev0","x":168,"y":48,"label":"JK-FF"},
    {"type":"In","id":"dev1","x":120,"y":32,"label":"T"},
    {"type":"In","id":"dev2","x":120,"y":80,"label":"CLK"},
    {"type":"Out","id":"dev3","x":248,"y":32,"label":"Q"},
    {"type":"Out","id":"dev4","x":248,"y":80,"label":"~Q"},
    {"type":"Toggle","id":"dev5","x":72,"y":32,"label":"Toggle"},
    {"type":"PushOn","id":"dev6","x":72,"y":80,"label":"PushOn"},
    {"type":"DC","id":"dev7","x":24,"y":56,"label":"DC"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev1.out0"},
    {"from":"dev0.in1","to":"dev2.out0"},
    {"from":"dev0.in2","to":"dev1.out0"},
    {"from":"dev1.in0","to":"dev5.out0"},
    {"from":"dev2.in0","to":"dev6.out0"},
    {"from":"dev3.in0","to":"dev0.out0"},
    {"from":"dev4.in0","to":"dev0.out1"},
    {"from":"dev5.in0","to":"dev7.out0"},
    {"from":"dev6.in0","to":"dev7.out0"}
  ]
}
);

simcir.registerDevice('D-FF',
{
  "width":540,
  "height":200,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"In","id":"dev0","x":128,"y":24,"label":"D"},
    {"type":"In","id":"dev1","x":168,"y":128,"label":"CLK"},
    {"type":"NOT","id":"dev2","x":176,"y":64,"label":"NOT"},
    {"type":"NAND","id":"dev3","x":224,"y":32,"label":"NAND"},
    {"type":"NAND","id":"dev4","x":224,"y":96,"label":"NAND"},
    {"type":"RS-FF","id":"dev5","x":272,"y":64,"label":"RS-FF"},
    {"type":"NOT","id":"dev6","x":296,"y":128,"label":"NOT"},
    {"type":"NAND","id":"dev7","x":352,"y":32,"label":"NAND"},
    {"type":"NAND","id":"dev8","x":352,"y":96,"label":"NAND"},
    {"type":"RS-FF","id":"dev9","x":400,"y":64,"label":"RS-FF"},
    {"type":"Out","id":"dev10","x":480,"y":32,"label":"Q"},
    {"type":"Out","id":"dev11","x":480,"y":96,"label":"~Q"},
    {"type":"Toggle","id":"dev12","x":80,"y":24,"label":"Toggle"},
    {"type":"PushOn","id":"dev13","x":80,"y":128,"label":"PushOn"},
    {"type":"DC","id":"dev14","x":32,"y":72,"label":"DC"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev12.out0"},
    {"from":"dev1.in0","to":"dev13.out0"},
    {"from":"dev2.in0","to":"dev0.out0"},
    {"from":"dev3.in0","to":"dev0.out0"},
    {"from":"dev3.in1","to":"dev1.out0"},
    {"from":"dev4.in0","to":"dev1.out0"},
    {"from":"dev4.in1","to":"dev2.out0"},
    {"from":"dev5.in0","to":"dev3.out0"},
    {"from":"dev5.in1","to":"dev4.out0"},
    {"from":"dev6.in0","to":"dev1.out0"},
    {"from":"dev7.in0","to":"dev5.out0"},
    {"from":"dev7.in1","to":"dev6.out0"},
    {"from":"dev8.in0","to":"dev6.out0"},
    {"from":"dev8.in1","to":"dev5.out1"},
    {"from":"dev9.in0","to":"dev7.out0"},
    {"from":"dev9.in1","to":"dev8.out0"},
    {"from":"dev10.in0","to":"dev9.out0"},
    {"from":"dev11.in0","to":"dev9.out1"},
    {"from":"dev12.in0","to":"dev14.out0"},
    {"from":"dev13.in0","to":"dev14.out0"}
  ]
}
);

simcir.registerDevice('8bitCounter',
{
  "width":320,
  "height":420,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"T-FF","id":"dev0","x":184,"y":16,"label":"T-FF"},
    {"type":"T-FF","id":"dev1","x":184,"y":64,"label":"T-FF"},
    {"type":"T-FF","id":"dev2","x":184,"y":112,"label":"T-FF"},
    {"type":"T-FF","id":"dev3","x":184,"y":160,"label":"T-FF"},
    {"type":"T-FF","id":"dev4","x":184,"y":208,"label":"T-FF"},
    {"type":"T-FF","id":"dev5","x":184,"y":256,"label":"T-FF"},
    {"type":"T-FF","id":"dev6","x":184,"y":304,"label":"T-FF"},
    {"type":"T-FF","id":"dev7","x":184,"y":352,"label":"T-FF"},
    {"type":"Out","id":"dev8","x":264,"y":16,"label":"D0"},
    {"type":"Out","id":"dev9","x":264,"y":64,"label":"D1"},
    {"type":"Out","id":"dev10","x":264,"y":112,"label":"D2"},
    {"type":"Out","id":"dev11","x":264,"y":160,"label":"D3"},
    {"type":"Out","id":"dev12","x":264,"y":208,"label":"D4"},
    {"type":"Out","id":"dev13","x":264,"y":256,"label":"D5"},
    {"type":"Out","id":"dev14","x":264,"y":304,"label":"D6"},
    {"type":"Out","id":"dev15","x":264,"y":352,"label":"D7"},
    {"type":"In","id":"dev16","x":120,"y":16,"label":"T"},
    {"type":"In","id":"dev17","x":120,"y":112,"label":"CLK"},
    {"type":"PushOn","id":"dev18","x":72,"y":112,"label":"PushOn"},
    {"type":"DC","id":"dev19","x":24,"y":16,"label":"DC"},
    {"type":"Toggle","id":"dev20","x":72,"y":16,"label":"Toggle"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev16.out0"},
    {"from":"dev0.in1","to":"dev17.out0"},
    {"from":"dev1.in0","to":"dev16.out0"},
    {"from":"dev1.in1","to":"dev0.out0"},
    {"from":"dev2.in0","to":"dev16.out0"},
    {"from":"dev2.in1","to":"dev1.out0"},
    {"from":"dev3.in0","to":"dev16.out0"},
    {"from":"dev3.in1","to":"dev2.out0"},
    {"from":"dev4.in0","to":"dev16.out0"},
    {"from":"dev4.in1","to":"dev3.out0"},
    {"from":"dev5.in0","to":"dev16.out0"},
    {"from":"dev5.in1","to":"dev4.out0"},
    {"from":"dev6.in0","to":"dev16.out0"},
    {"from":"dev6.in1","to":"dev5.out0"},
    {"from":"dev7.in0","to":"dev16.out0"},
    {"from":"dev7.in1","to":"dev6.out0"},
    {"from":"dev8.in0","to":"dev0.out0"},
    {"from":"dev9.in0","to":"dev1.out0"},
    {"from":"dev10.in0","to":"dev2.out0"},
    {"from":"dev11.in0","to":"dev3.out0"},
    {"from":"dev12.in0","to":"dev4.out0"},
    {"from":"dev13.in0","to":"dev5.out0"},
    {"from":"dev14.in0","to":"dev6.out0"},
    {"from":"dev15.in0","to":"dev7.out0"},
    {"from":"dev16.in0","to":"dev20.out0"},
    {"from":"dev17.in0","to":"dev18.out0"},
    {"from":"dev18.in0","to":"dev19.out0"},
    {"from":"dev20.in0","to":"dev19.out0"}
  ]
}
);

simcir.registerDevice('HalfAdder',
{
  "width":320,
  "height":160,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"Toggle","id":"dev0","x":96,"y":80,"label":"Toggle"},
    {"type":"DC","id":"dev1","x":48,"y":56,"label":"DC"},
    {"type":"AND","id":"dev2","x":192,"y":80,"label":"AND"},
    {"type":"XOR","id":"dev3","x":192,"y":32,"label":"XOR"},
    {"type":"In","id":"dev4","x":144,"y":32,"label":"A"},
    {"type":"In","id":"dev5","x":144,"y":80,"label":"B"},
    {"type":"Out","id":"dev6","x":240,"y":32,"label":"S"},
    {"type":"Out","id":"dev7","x":240,"y":80,"label":"C"},
    {"type":"Toggle","id":"dev8","x":96,"y":32,"label":"Toggle"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev1.out0"},
    {"from":"dev2.in0","to":"dev4.out0"},
    {"from":"dev2.in1","to":"dev5.out0"},
    {"from":"dev3.in0","to":"dev4.out0"},
    {"from":"dev3.in1","to":"dev5.out0"},
    {"from":"dev4.in0","to":"dev8.out0"},
    {"from":"dev5.in0","to":"dev0.out0"},
    {"from":"dev6.in0","to":"dev3.out0"},
    {"from":"dev7.in0","to":"dev2.out0"},
    {"from":"dev8.in0","to":"dev1.out0"}
  ]
}
);

simcir.registerDevice('FullAdder',
{
  "width":440,
  "height":200,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"In","id":"dev0","x":120,"y":32,"label":"Cin"},
    {"type":"In","id":"dev1","x":120,"y":80,"label":"A"},
    {"type":"In","id":"dev2","x":120,"y":128,"label":"B"},
    {"type":"Toggle","id":"dev3","x":72,"y":32,"label":"Toggle"},
    {"type":"Toggle","id":"dev4","x":72,"y":80,"label":"Toggle"},
    {"type":"Toggle","id":"dev5","x":72,"y":128,"label":"Toggle"},
    {"type":"DC","id":"dev6","x":24,"y":80,"label":"DC"},
    {"type":"HalfAdder","id":"dev7","x":168,"y":104,"label":"HalfAdder"},
    {"type":"HalfAdder","id":"dev8","x":248,"y":56,"label":"HalfAdder"},
    {"type":"OR","id":"dev9","x":328,"y":104,"label":"OR"},
    {"type":"Out","id":"dev10","x":376,"y":104,"label":"Cout"},
    {"type":"Out","id":"dev11","x":376,"y":48,"label":"S"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev3.out0"},
    {"from":"dev1.in0","to":"dev4.out0"},
    {"from":"dev2.in0","to":"dev5.out0"},
    {"from":"dev3.in0","to":"dev6.out0"},
    {"from":"dev4.in0","to":"dev6.out0"},
    {"from":"dev5.in0","to":"dev6.out0"},
    {"from":"dev7.in0","to":"dev1.out0"},
    {"from":"dev7.in1","to":"dev2.out0"},
    {"from":"dev8.in0","to":"dev0.out0"},
    {"from":"dev8.in1","to":"dev7.out0"},
    {"from":"dev9.in0","to":"dev8.out1"},
    {"from":"dev9.in1","to":"dev7.out1"},
    {"from":"dev10.in0","to":"dev9.out0"},
    {"from":"dev11.in0","to":"dev8.out0"}
  ]
}
);

simcir.registerDevice('4bitAdder',
{
  "width":280,
  "height":480,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"FullAdder","id":"dev0","x":120,"y":72,"label":"FullAdder"},
    {"type":"FullAdder","id":"dev1","x":120,"y":136,"label":"FullAdder"},
    {"type":"FullAdder","id":"dev2","x":120,"y":200,"label":"FullAdder"},
    {"type":"FullAdder","id":"dev3","x":120,"y":264,"label":"FullAdder"},
    {"type":"In","id":"dev4","x":40,"y":80,"label":"A0"},
    {"type":"In","id":"dev5","x":40,"y":128,"label":"A1"},
    {"type":"In","id":"dev6","x":40,"y":176,"label":"A2"},
    {"type":"In","id":"dev7","x":40,"y":224,"label":"A3"},
    {"type":"In","id":"dev8","x":40,"y":272,"label":"B0"},
    {"type":"In","id":"dev9","x":40,"y":320,"label":"B1"},
    {"type":"In","id":"dev10","x":40,"y":368,"label":"B2"},
    {"type":"In","id":"dev11","x":40,"y":416,"label":"B3"},
    {"type":"Out","id":"dev12","x":200,"y":72,"label":"S0"},
    {"type":"Out","id":"dev13","x":200,"y":120,"label":"S1"},
    {"type":"Out","id":"dev14","x":200,"y":168,"label":"S2"},
    {"type":"Out","id":"dev15","x":200,"y":216,"label":"S3"},
    {"type":"Out","id":"dev16","x":200,"y":280,"label":"Cout"},
    {"type":"In","id":"dev17","x":40,"y":24,"label":"Cin"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev17.out0"},
    {"from":"dev0.in1","to":"dev4.out0"},
    {"from":"dev0.in2","to":"dev8.out0"},
    {"from":"dev1.in0","to":"dev0.out1"},
    {"from":"dev1.in1","to":"dev5.out0"},
    {"from":"dev1.in2","to":"dev9.out0"},
    {"from":"dev2.in0","to":"dev1.out1"},
    {"from":"dev2.in1","to":"dev6.out0"},
    {"from":"dev2.in2","to":"dev10.out0"},
    {"from":"dev3.in0","to":"dev2.out1"},
    {"from":"dev3.in1","to":"dev7.out0"},
    {"from":"dev3.in2","to":"dev11.out0"},
    {"from":"dev12.in0","to":"dev0.out0"},
    {"from":"dev13.in0","to":"dev1.out0"},
    {"from":"dev14.in0","to":"dev2.out0"},
    {"from":"dev15.in0","to":"dev3.out0"},
    {"from":"dev16.in0","to":"dev3.out1"}
  ]
}
);

simcir.registerDevice('2to4BinaryDecoder',
{
  "width":400,
  "height":240,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"AND","numInputs":3,"id":"dev0","x":280,"y":24,"label":"AND"},
    {"type":"AND","numInputs":3,"id":"dev1","x":280,"y":72,"label":"AND"},
    {"type":"AND","numInputs":3,"id":"dev2","x":280,"y":120,"label":"AND"},
    {"type":"NOT","id":"dev3","x":192,"y":48,"label":"NOT"},
    {"type":"AND","numInputs":3,"id":"dev4","x":280,"y":168,"label":"AND"},
    {"type":"NOT","id":"dev5","x":192,"y":96,"label":"NOT"},
    {"type":"In","id":"dev6","x":192,"y":176,"label":"OE"},
    {"type":"In","id":"dev7","x":128,"y":48,"label":"D0"},
    {"type":"In","id":"dev8","x":128,"y":96,"label":"D1"},
    {"type":"Toggle","id":"dev9","x":80,"y":48,"label":"Toggle"},
    {"type":"Toggle","id":"dev10","x":80,"y":96,"label":"Toggle"},
    {"type":"DC","id":"dev11","x":32,"y":96,"label":"DC"},
    {"type":"Out","id":"dev12","x":328,"y":24,"label":"A0"},
    {"type":"Out","id":"dev13","x":328,"y":72,"label":"A1"},
    {"type":"Out","id":"dev14","x":328,"y":120,"label":"A2"},
    {"type":"Out","id":"dev15","x":328,"y":168,"label":"A3"},
    {"type":"Toggle","id":"dev16","x":80,"y":144,"label":"Toggle"}
  ],
  "connectors":[
    {"from":"dev0.in0","to":"dev3.out0"},
    {"from":"dev0.in1","to":"dev5.out0"},
    {"from":"dev0.in2","to":"dev6.out0"},
    {"from":"dev1.in0","to":"dev7.out0"},
    {"from":"dev1.in1","to":"dev5.out0"},
    {"from":"dev1.in2","to":"dev6.out0"},
    {"from":"dev2.in0","to":"dev3.out0"},
    {"from":"dev2.in1","to":"dev8.out0"},
    {"from":"dev2.in2","to":"dev6.out0"},
    {"from":"dev3.in0","to":"dev7.out0"},
    {"from":"dev4.in0","to":"dev7.out0"},
    {"from":"dev4.in1","to":"dev8.out0"},
    {"from":"dev4.in2","to":"dev6.out0"},
    {"from":"dev5.in0","to":"dev8.out0"},
    {"from":"dev6.in0","to":"dev16.out0"},
    {"from":"dev7.in0","to":"dev9.out0"},
    {"from":"dev8.in0","to":"dev10.out0"},
    {"from":"dev9.in0","to":"dev11.out0"},
    {"from":"dev10.in0","to":"dev11.out0"},
    {"from":"dev12.in0","to":"dev0.out0"},
    {"from":"dev13.in0","to":"dev1.out0"},
    {"from":"dev14.in0","to":"dev2.out0"},
    {"from":"dev15.in0","to":"dev4.out0"},
    {"from":"dev16.in0","to":"dev11.out0"}
  ]
}
);

simcir.registerDevice('3to8BinaryDecoder',
{
  "width":360,
  "height":440,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"In","id":"dev0","x":24,"y":144,"label":"D0"},
    {"type":"In","id":"dev1","x":24,"y":192,"label":"D1"},
    {"type":"In","id":"dev2","x":24,"y":240,"label":"D2"},
    {"type":"In","id":"dev3","x":24,"y":304,"label":"OE"},
    {"type":"NOT","id":"dev4","x":72,"y":240,"label":"NOT"},
    {"type":"AND","id":"dev5","x":120,"y":248,"label":"AND"},
    {"type":"AND","id":"dev6","x":120,"y":296,"label":"AND"},
    {"type":"2to4BinaryDecoder","id":"dev7","x":184,"y":144,"label":"2to4BinaryDecoder"},
    {"type":"2to4BinaryDecoder","id":"dev8","x":184,"y":224,"label":"2to4BinaryDecoder"},
    {"type":"Out","id":"dev9","x":296,"y":32,"label":"A0"},
    {"type":"Out","id":"dev10","x":296,"y":80,"label":"A1"},
    {"type":"Out","id":"dev11","x":296,"y":128,"label":"A2"},
    {"type":"Out","id":"dev12","x":296,"y":176,"label":"A3"},
    {"type":"Out","id":"dev13","x":296,"y":224,"label":"A4"},
    {"type":"Out","id":"dev14","x":296,"y":272,"label":"A5"},
    {"type":"Out","id":"dev15","x":296,"y":320,"label":"A6"},
    {"type":"Out","id":"dev16","x":296,"y":368,"label":"A7"}
  ],
  "connectors":[
    {"from":"dev4.in0","to":"dev2.out0"},
    {"from":"dev5.in0","to":"dev4.out0"},
    {"from":"dev5.in1","to":"dev3.out0"},
    {"from":"dev6.in0","to":"dev2.out0"},
    {"from":"dev6.in1","to":"dev3.out0"},
    {"from":"dev7.in0","to":"dev0.out0"},
    {"from":"dev7.in1","to":"dev1.out0"},
    {"from":"dev7.in2","to":"dev5.out0"},
    {"from":"dev8.in0","to":"dev0.out0"},
    {"from":"dev8.in1","to":"dev1.out0"},
    {"from":"dev8.in2","to":"dev6.out0"},
    {"from":"dev9.in0","to":"dev7.out0"},
    {"from":"dev10.in0","to":"dev7.out1"},
    {"from":"dev11.in0","to":"dev7.out2"},
    {"from":"dev12.in0","to":"dev7.out3"},
    {"from":"dev13.in0","to":"dev8.out0"},
    {"from":"dev14.in0","to":"dev8.out1"},
    {"from":"dev15.in0","to":"dev8.out2"},
    {"from":"dev16.in0","to":"dev8.out3"}
  ]
}
);

simcir.registerDevice('4to16BinaryDecoder',
{
  "width":440,
  "height":360,
  "showToolbox":false,
  "toolbox":[
  ],
  "devices":[
    {"type":"In","id":"dev0","x":32,"y":56,"label":"D0"},
    {"type":"In","id":"dev1","x":32,"y":104,"label":"D1"},
    {"type":"In","id":"dev2","x":32,"y":152,"label":"D2"},
    {"type":"In","id":"dev3","x":32,"y":200,"label":"D3"},
    {"type":"In","id":"dev4","x":32,"y":264,"label":"OE"},
    {"type":"NOT","id":"dev5","x":80,"y":200,"label":"NOT"},
    {"type":"AND","id":"dev6","x":136,"y":208,"label":"AND"},
    {"type":"AND","id":"dev7","x":136,"y":256,"label":"AND"},
    {"type":"3to8BinaryDecoder","id":"dev8","x":208,"y":32,"label":"3to8BinaryDecoder"},
    {"type":"3to8BinaryDecoder","id":"dev9","x":208,"y":184,"label":"3to8BinaryDecoder"},
    {"type":"BusOut","id":"dev10","x":320,"y":88,"label":"BusOut"},
    {"type":"BusOut","id":"dev11","x":320,"y":184,"label":"BusOut"},
    {"type":"Out","id":"dev12","x":376,"y":128,"label":"A0"},
    {"type":"Out","id":"dev13","x":376,"y":184,"label":"A1"}
  ],
  "connectors":[
    {"from":"dev5.in0","to":"dev3.out0"},
    {"from":"dev6.in0","to":"dev5.out0"},
    {"from":"dev6.in1","to":"dev4.out0"},
    {"from":"dev7.in0","to":"dev3.out0"},
    {"from":"dev7.in1","to":"dev4.out0"},
    {"from":"dev8.in0","to":"dev0.out0"},
    {"from":"dev8.in1","to":"dev1.out0"},
    {"from":"dev8.in2","to":"dev2.out0"},
    {"from":"dev8.in3","to":"dev6.out0"},
    {"from":"dev9.in0","to":"dev0.out0"},
    {"from":"dev9.in1","to":"dev1.out0"},
    {"from":"dev9.in2","to":"dev2.out0"},
    {"from":"dev9.in3","to":"dev7.out0"},
    {"from":"dev10.in0","to":"dev8.out0"},
    {"from":"dev10.in1","to":"dev8.out1"},
    {"from":"dev10.in2","to":"dev8.out2"},
    {"from":"dev10.in3","to":"dev8.out3"},
    {"from":"dev10.in4","to":"dev8.out4"},
    {"from":"dev10.in5","to":"dev8.out5"},
    {"from":"dev10.in6","to":"dev8.out6"},
    {"from":"dev10.in7","to":"dev8.out7"},
    {"from":"dev11.in0","to":"dev9.out0"},
    {"from":"dev11.in1","to":"dev9.out1"},
    {"from":"dev11.in2","to":"dev9.out2"},
    {"from":"dev11.in3","to":"dev9.out3"},
    {"from":"dev11.in4","to":"dev9.out4"},
    {"from":"dev11.in5","to":"dev9.out5"},
    {"from":"dev11.in6","to":"dev9.out6"},
    {"from":"dev11.in7","to":"dev9.out7"},
    {"from":"dev12.in0","to":"dev10.out0"},
    {"from":"dev13.in0","to":"dev11.out0"}
  ]
}
);
