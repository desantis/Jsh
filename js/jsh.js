require(["oK", "convert"], function (oK, convert) {
	document.getElementById("textedit").onkeydown = function(event) {
		if (event.keyCode == 13 && event.shiftKey) {
			saveBuffer();
			if (this.selectionStart == this.selectionEnd) {
				prompt.value = this.value;
			}
			else {
				prompt.value = this.value.substring(this.selectionStart, this.selectionEnd);
			}
			processLine();
			prompt.value = "";
			printRepl("&nbsp;&nbsp");
			return false;
		}
		if (event.keyCode == 9) {
			var text  = this.value;
			var start = this.selectionStart;
			var end   = this.selectionEnd;
			this.value = text.substring(0, start) + '\t' + text.substring(end);
			this.selectionStart = this.selectionEnd = start + 1;
			saveBuffer();
			return false;
		}
		saveBuffer();
	};
	function saveBuffer() {
		localStorage.setItem("oKeditbuffer", document.getElementById("textedit").value);
	}
	function loadBuffer() {
		var editbuffer = localStorage.getItem("oKeditbuffer");
		if (!editbuffer) { editbuffer = "/ contents of this editor is automatically saved in local storage."; }
		document.getElementById("textedit").value = editbuffer;
	}
	function printForm(x) {
		return stok(format(x));
	}

	var env = baseEnv();
	var entries = [];
	var entryIndex = 0;
	var partial = "";
	var eid = 0;

	setIO("0:", 2, print);
	setIO("0:", 4, print);
	setIO("0:", 1, readText);
	setIO("1:", 1, readJSON);
	setIO("5:", 0, printForm);
	setIO("5:", 1, printForm);

	var repl = document.getElementById("repl");
	var scroll = document.getElementById("scroll");
	var panel = document.getElementById("scroll-h");
	var prompt = document.getElementById("prompt");

	prompt.focus();
	prompt.onkeydown = processInput;
	scroll.innerHTML =
		"Welcome to <a href='https://github.com/dr3wme/jsh' target='_blank'>Jsh</a> : v"+version+
		" :: related : <a href='http://archive.vector.org.uk/art10501320' target='_blank'>kOS</a>!"+
		"<br>&nbsp;&nbsp;";

	function escapeHTML(text) {
		text += "";
		text = text.replace(/&/g, "&amp;");
		text = text.replace(/</g, "&lt;");
		text = text.replace(/>/g, "&gt;");
		text = text.replace(/ /g, "&nbsp;");
		text = text.replace(/\r/g, "<font color='gray'>&rarr;</font>");
		text = text.replace(/\n/g, "<br>");
		return text;
	}

	function toggle(id) {
		e = document.getElementById(id);
		e.style.display = e.style.display == "none" ? "inline" : "none";
	}

	function processInput(e) {
		if (e.keyCode == 38) {
			if (entries.length == 0) { return false; }
			if (entryIndex > 0) {
				entryIndex--;
				prompt.value = entries[entryIndex];
			}
			return false;
		}
		if (e.keyCode == 40) {
			if (entries.length == 0 || entryIndex >= entries.length-1) {
				entryIndex = entries.length;
				prompt.value = "";
				return false;
			}
			entryIndex++;
			prompt.value = entries[entryIndex];
			return false;
		}
		if (e.keyCode != 13) { return; }
		printReplBare("<font color='gray'>"+escapeHTML(prompt.value)+"</font>");
		if (prompt.value != "") { processLine(); }
		if (prompt.value != "") { entries.push(prompt.value); }
		entryIndex = entries.length;
		prompt.value = "";
		printRepl(partial == "" ? "&nbsp;&nbsp" : "&gt;&nbsp;");
		return false;
	}

	function printEnv(filter, label) {
		var found = {};
		var len = 0;
		for(var key in env.d) {
			if (!filter(env.d[key])) { continue; }
			len = Math.max(key.length, len);
			found[key] = env.d[key];
		}
		for(var name in found) {
			var n = name; for(var x=(len+1 - n.length); x>0; x--) { n += "&nbsp;"; }
			printRepl(n + ": " + format(found[name]));
		}
		if (len == 0) {
			printRepl("no "+label+" defined.");
		}
		printRepl("");
	}

	function processLine() {
		if (prompt.value == "\\\\") { partial = ""; return; }
		if (prompt.value == "\\e") {
			var editor = document.getElementById("editor");
			if (editor.style.display == "inline") {
				editor.style.display = "none";
				repl.style.width = "80%";
				saveBuffer();
			}
			else {
				editor.style.display = "inline";
				repl.style.width = "40%";
				loadBuffer();
				document.getElementById("textedit").focus();
			}
			return;
		}
		if (prompt.value == "\\r") {
			saveBuffer();
			prompt.value = document.getElementById("textedit").value;
		}
		if (prompt.value == "\\c") {
			scroll.innerHTML = "";
			panel.scrollTop = panel.scrollHeight;
			return;
		}
		if (prompt.value == "\\f") {
			printEnv(function(v) { return v.t >= 5 && v.t != 13; }, "functions");
			return;
		}
		if (prompt.value == "\\v") {
			printEnv(function(v) { return v.t < 5; }, "variables");
			return;
		}
		if (prompt.value == "kOS") { printRepl("one system/all devices"); return; }
		if (prompt.value.lastIndexOf("\\u") == 0) {
			var code = prompt.value.slice(2);
			var enc = encodeURIComponent(code).replace(/[!'()*]/g, function(c) {
				return '%' + c.charCodeAt(0).toString(16);
			});
			var url = document.location + "?run=" + enc;
			printRepl("oK code url:");
			printRepl("<a href=\""+url+"\" target='_blank'>"+url+"</a>");
			return;
		}
		var showtime = false;
		if (prompt.value.lastIndexOf("\\t") == 0) {
			prompt.value = prompt.value.slice(2);
			showtime = true;
		}
		var parsed = null;
		try { parsed = parse(" " + partial + "; " + prompt.value); }
		catch(error) {
			if (done() && (
				error.message == "parse error. '}' expected." ||
				error.message == "parse error. ')' expected." ||
				error.message == "parse error. ']' expected.")) {
				partial += ((partial!="")?";":"") + prompt.value;
				return;
			}
			else {
				printRepl("<font color='red'>"+error.message+"</font>");
				partial = "";
				return;
			}
		}
		partial = "";
		try {
			var starttime = new Date().getTime();
			printRepl(escapeHTML(format(run(parsed, env))));
			if (showtime) {
				var endtime = new Date().getTime();
				printRepl("completed in "+(endtime-starttime)+"ms.");
			}
		}
		catch(error) {
			printRepl(
				"<span style='color: red; cursor:pointer;' onclick='toggle(\"e"+(eid)+"\")'>"+error.message+
				"<div class='err' id='e"+(eid++)+"'><br>"+escapeHTML(error.stack)+"</div></span>"
			);
		}
	}

	function printReplBare(x) {
		scroll.innerHTML += x;
		panel.scrollTop = panel.scrollHeight;
	}

	function printRepl(x) {
		printReplBare("<br>");
		printReplBare(x);
	}

	function print(x, y) {
		// todo: use x to select a file descriptor
		try {
			var t = tojs(y);
			if (typeof t == "string") { printRepl(escapeHTML(t)); return y; }
			if (Array.isArray(t) && t.every(function(v) { return typeof v == "string"; })) {
				t.map(function(v) { printRepl(escapeHTML(v)); }); return y;
			}
		}
		catch(e) {}
		throw new Error("0: can only display strings or lists of strings.");
	}

	function readAjax(x) {
		var url = tojs(x);
		if (typeof url != 'string') { throw new Error("string expected."); }
		var request = new XMLHttpRequest();
		request.open('GET', url, false);
		request.send(null);
		return [request.status, request.responseText];
	}

	function readText(x) { return tok(readAjax(x)); }

	function readJSON(x) {
		var t = readAjax(x);
		t[1] = JSON.parse(t[1]);
		return tok(t);
	}

	var urlstring = location.search.match(/run=([a-zA-Z0-9-_.!~*'()%]+)/);
	if (urlstring) {
		var code = decodeURIComponent(urlstring[1]).trim();
		printRepl("from url ");
		prompt.value = code;
		processInput({keyCode:13});
	}

});