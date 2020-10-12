var perfetto = (function () {
	'use strict';

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, basedir, module) {
		return module = {
		  path: basedir,
		  exports: {},
		  require: function (path, base) {
	      return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
	    }
		}, fn(module, module.exports), module.exports;
	}

	function commonjsRequire () {
		throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
	}

	var tslib = createCommonjsModule(function (module) {
	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation.

	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
	REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
	AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
	INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
	LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
	OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
	PERFORMANCE OF THIS SOFTWARE.
	***************************************************************************** */

	/* global global, define, System, Reflect, Promise */
	var __extends;
	var __assign;
	var __rest;
	var __decorate;
	var __param;
	var __metadata;
	var __awaiter;
	var __generator;
	var __exportStar;
	var __values;
	var __read;
	var __spread;
	var __spreadArrays;
	var __await;
	var __asyncGenerator;
	var __asyncDelegator;
	var __asyncValues;
	var __makeTemplateObject;
	var __importStar;
	var __importDefault;
	var __classPrivateFieldGet;
	var __classPrivateFieldSet;
	var __createBinding;
	(function (factory) {
	    var root = typeof commonjsGlobal === "object" ? commonjsGlobal : typeof self === "object" ? self : typeof this === "object" ? this : {};
	    {
	        factory(createExporter(root, createExporter(module.exports)));
	    }
	    function createExporter(exports, previous) {
	        if (exports !== root) {
	            if (typeof Object.create === "function") {
	                Object.defineProperty(exports, "__esModule", { value: true });
	            }
	            else {
	                exports.__esModule = true;
	            }
	        }
	        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
	    }
	})
	(function (exporter) {
	    var extendStatics = Object.setPrototypeOf ||
	        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

	    __extends = function (d, b) {
	        extendStatics(d, b);
	        function __() { this.constructor = d; }
	        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	    };

	    __assign = Object.assign || function (t) {
	        for (var s, i = 1, n = arguments.length; i < n; i++) {
	            s = arguments[i];
	            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
	        }
	        return t;
	    };

	    __rest = function (s, e) {
	        var t = {};
	        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
	            t[p] = s[p];
	        if (s != null && typeof Object.getOwnPropertySymbols === "function")
	            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
	                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
	                    t[p[i]] = s[p[i]];
	            }
	        return t;
	    };

	    __decorate = function (decorators, target, key, desc) {
	        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	        return c > 3 && r && Object.defineProperty(target, key, r), r;
	    };

	    __param = function (paramIndex, decorator) {
	        return function (target, key) { decorator(target, key, paramIndex); }
	    };

	    __metadata = function (metadataKey, metadataValue) {
	        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
	    };

	    __awaiter = function (thisArg, _arguments, P, generator) {
	        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	        return new (P || (P = Promise))(function (resolve, reject) {
	            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	            step((generator = generator.apply(thisArg, _arguments || [])).next());
	        });
	    };

	    __generator = function (thisArg, body) {
	        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
	        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
	        function verb(n) { return function (v) { return step([n, v]); }; }
	        function step(op) {
	            if (f) throw new TypeError("Generator is already executing.");
	            while (_) try {
	                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
	                if (y = 0, t) op = [op[0] & 2, t.value];
	                switch (op[0]) {
	                    case 0: case 1: t = op; break;
	                    case 4: _.label++; return { value: op[1], done: false };
	                    case 5: _.label++; y = op[1]; op = [0]; continue;
	                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
	                    default:
	                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
	                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
	                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
	                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
	                        if (t[2]) _.ops.pop();
	                        _.trys.pop(); continue;
	                }
	                op = body.call(thisArg, _);
	            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
	            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
	        }
	    };

	    __createBinding = function(o, m, k, k2) {
	        if (k2 === undefined) k2 = k;
	        o[k2] = m[k];
	    };

	    __exportStar = function (m, exports) {
	        for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) exports[p] = m[p];
	    };

	    __values = function (o) {
	        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
	        if (m) return m.call(o);
	        if (o && typeof o.length === "number") return {
	            next: function () {
	                if (o && i >= o.length) o = void 0;
	                return { value: o && o[i++], done: !o };
	            }
	        };
	        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	    };

	    __read = function (o, n) {
	        var m = typeof Symbol === "function" && o[Symbol.iterator];
	        if (!m) return o;
	        var i = m.call(o), r, ar = [], e;
	        try {
	            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
	        }
	        catch (error) { e = { error: error }; }
	        finally {
	            try {
	                if (r && !r.done && (m = i["return"])) m.call(i);
	            }
	            finally { if (e) throw e.error; }
	        }
	        return ar;
	    };

	    __spread = function () {
	        for (var ar = [], i = 0; i < arguments.length; i++)
	            ar = ar.concat(__read(arguments[i]));
	        return ar;
	    };

	    __spreadArrays = function () {
	        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
	        for (var r = Array(s), k = 0, i = 0; i < il; i++)
	            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
	                r[k] = a[j];
	        return r;
	    };

	    __await = function (v) {
	        return this instanceof __await ? (this.v = v, this) : new __await(v);
	    };

	    __asyncGenerator = function (thisArg, _arguments, generator) {
	        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
	        var g = generator.apply(thisArg, _arguments || []), i, q = [];
	        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
	        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
	        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
	        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
	        function fulfill(value) { resume("next", value); }
	        function reject(value) { resume("throw", value); }
	        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
	    };

	    __asyncDelegator = function (o) {
	        var i, p;
	        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
	        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
	    };

	    __asyncValues = function (o) {
	        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
	        var m = o[Symbol.asyncIterator], i;
	        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
	        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
	        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
	    };

	    __makeTemplateObject = function (cooked, raw) {
	        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
	        return cooked;
	    };

	    __importStar = function (mod) {
	        if (mod && mod.__esModule) return mod;
	        var result = {};
	        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
	        result["default"] = mod;
	        return result;
	    };

	    __importDefault = function (mod) {
	        return (mod && mod.__esModule) ? mod : { "default": mod };
	    };

	    __classPrivateFieldGet = function (receiver, privateMap) {
	        if (!privateMap.has(receiver)) {
	            throw new TypeError("attempted to get private field on non-instance");
	        }
	        return privateMap.get(receiver);
	    };

	    __classPrivateFieldSet = function (receiver, privateMap, value) {
	        if (!privateMap.has(receiver)) {
	            throw new TypeError("attempted to set private field on non-instance");
	        }
	        privateMap.set(receiver, value);
	        return value;
	    };

	    exporter("__extends", __extends);
	    exporter("__assign", __assign);
	    exporter("__rest", __rest);
	    exporter("__decorate", __decorate);
	    exporter("__param", __param);
	    exporter("__metadata", __metadata);
	    exporter("__awaiter", __awaiter);
	    exporter("__generator", __generator);
	    exporter("__exportStar", __exportStar);
	    exporter("__createBinding", __createBinding);
	    exporter("__values", __values);
	    exporter("__read", __read);
	    exporter("__spread", __spread);
	    exporter("__spreadArrays", __spreadArrays);
	    exporter("__await", __await);
	    exporter("__asyncGenerator", __asyncGenerator);
	    exporter("__asyncDelegator", __asyncDelegator);
	    exporter("__asyncValues", __asyncValues);
	    exporter("__makeTemplateObject", __makeTemplateObject);
	    exporter("__importStar", __importStar);
	    exporter("__importDefault", __importDefault);
	    exporter("__classPrivateFieldGet", __classPrivateFieldGet);
	    exporter("__classPrivateFieldSet", __classPrivateFieldSet);
	});
	});

	var dist_file_map = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.UI_DIST_MAP = void 0;
	// __generated_by ../../gn/standalone/write_ui_dist_file_map.py
	exports.UI_DIST_MAP = {
	    files: {
	        'assets/Raleway-Thin.woff2': 'sha256-ZRS1+Xh/dFZeWZi/dz8QMWg/8PYQHNdazsNX2oX8s70=',
	        'assets/rec_cpu_coarse.png': 'sha256-gqTfM9LG4xSOLTC+auuWvy5ovTLbVG6wb4c9KP4dZSs=',
	        'assets/rec_vmstat.png': 'sha256-NPpW3mqNqAU9gLehEMmEJa0qFEPjIWTFgFb+shQzxoc=',
	        'assets/rec_meminfo.png': 'sha256-tj+d95JJdPLYN0jUgYuT6xtZe2oGvuI09yTT9iKi1ig=',
	        'assets/rec_mem_hifreq.png': 'sha256-KrITVZhp3/D+MetAFyY31NC68kJsdgu1DyPiZQksBU0=',
	        'assets/brand.png': 'sha256-U34ng2vKNqzITxwkGF+PPLQiM6YdB5fvDdqyHPHqiLo=',
	        'assets/modal.scss': 'sha256-nwuUMCJw9xiP7LMSmrt9sDItCYR4ZqLbPb2x0EWBUVc=',
	        'assets/rec_gpu_mem_total.png': 'sha256-M4ggVqemJEoIB14Zz0/wFL7nORk7B06q4pIM6u1U8vo=',
	        'assets/rec_cpu_fine.png': 'sha256-2ncaNBPU78Waf+H1VHr8qfcwhfSrRW+2yIBW3FVShLE=',
	        'assets/rec_ps_stats.png': 'sha256-KvVjhTipkSR3xOYFPxcyKOpO+NP220BTRmhr8h1F4gM=',
	        'assets/rec_board_voltage.png': 'sha256-6w5TN3sBYJNevRdjj3ZkzhDDwMsUID/EsOyL/v+JA2c=',
	        'engine_bundle.js.map': 'sha256-FOMGWN1Fr+Wo/O2mQsSjq1qkQ+0yX/NMFSxnamqCbos=',
	        'assets/rec_ftrace.png': 'sha256-+SxCOHlHkJw84Ev/oJxa5IcyHjRJEgCHtJVj4YNNC7I=',
	        'assets/rec_long_trace.png': 'sha256-IAj0+L2YJWw/uW1mNwf0bSQF269HqNlkwowapWbRsvg=',
	        'assets/rec_one_shot.png': 'sha256-CLJP9CsfHBUSEFFfn/mXVVZLFjKmLJVSqVYPxPHw56U=',
	        'controller_bundle.js': 'sha256-Ny0OMhbCqK6vS8998zha0gfmCNmPakA7xGhdtwGNYd4=',
	        'engine_bundle_dist.node_bin.stamp': 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
	        'assets/perfetto.scss': 'sha256-zzSCSkD3f3E4zgZsgR9Wnud4bBVz7H4eKmnsWV0oRGE=',
	        'scss.node_bin.stamp': 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
	        'frontend_bundle.js': 'sha256-S+y1R36qMF7U7xS9VWpLXVyRNfRAmRemjdktgkSsvi8=',
	        'assets/rec_ring_buf.png': 'sha256-IddHPrwbieCGZctKKbAHW2/1+3VQE3qXs1QwlkyoGKc=',
	        'perfetto.css': 'sha256-MimrboSe225nwvvz9mBa2vZJRLDDCcUaHZvd981dWvg=',
	        'controller_bundle_dist.node_bin.stamp': 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
	        'assets/MaterialIcons.woff2': 'sha256-THB+Mug7hh5UeaNZ5yZK88pWnLWCNTJMm8MtHXhPdas=',
	        'assets/Raleway-Regular.woff2': 'sha256-NlDei8Ldg1KwGqSenwriJQmOhqMdoysE2Bq7drWY0NY=',
	        'assets/record.scss': 'sha256-7RocUZzpyvNtcmOnB4wmRUeuJoB+c6eBZeCa6rKJcXc=',
	        'assets/RobotoCondensed-Regular.woff2': 'sha256-SaG04SlmRaovUTyHoOX+VqMFp+1njC9kmWMewfOzWFY=',
	        'assets/rec_java_heap_dump.png': 'sha256-wMPAmG/jj8mZUeHj/1RLxEInic0jLm4osHKUPicLoKc=',
	        'assets/rec_cpu_freq.png': 'sha256-0GNig+HKE0ag4KNmpOZvh+12teGKnWpoyGVYyzeYSrA=',
	        'assets/catapult_trace_viewer.js': 'sha256-tpvMkJYBPHRuDjmhKIiiuCVJzjgWa4LcIRxqsb3axf0=',
	        'assets/rec_logcat.png': 'sha256-saca16fp7AqXCVCEJqZav1/h/FuiEZJOl0avdhBjUdM=',
	        'assets/trace_info_page.scss': 'sha256-zhnzBpaEe2cc30mPpPA3sqBw9SH6cfDqyUJ+5f0Fh30=',
	        'assets/rec_cpu_voltage.png': 'sha256-ap0/YZ0p0Q3Py6GoOJqrb2mPg8i2H9/09JpotIWZYr0=',
	        'assets/analyze_page.scss': 'sha256-Q/gHF16l30b7V3amyyOHcsRV7i18V1xr5mFIlWxwlmI=',
	        'assets/RobotoCondensed-Light.woff2': 'sha256-rELob/HQ/Hinhwpyz10bvwpQmoUtuh2Kvcc0iSsNSEQ=',
	        'assets/common.scss': 'sha256-BOiqjq27QFRRyxPFY7cLI+jCZ7I4JGfgO+bCXz/uCpM=',
	        'frontend_bundle_dist.node_bin.stamp': 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
	        'assets/rec_battery_counters.png': 'sha256-ps4d9PYYa5i8n6wgMVauITCXGQrv+y7PBudZbZLnHyw=',
	        'assets/logo-3d.png': 'sha256-cNpuyQnaU7JRoW+T+QldM5a5xk4HwKVffw45V2tiKe0=',
	        'assets/details.scss': 'sha256-eESdCrz1W0YJyrR/GBEHDxsgJTAbl0NT1Lg5QQMr460=',
	        'assets/rec_lmk.png': 'sha256-i5s7gC4FPJF898aRvxew1ob0qp77Ts7YE/I65FSnsTg=',
	        'assets/RobotoMono-Regular.woff2': 'sha256-5DK7glyj4CZ9Yo+ttqjKY7DMo/xzRfFcfwgPeouCFl4=',
	        'assets/metrics_page.scss': 'sha256-N695RHdPngDilZK1/ERZotgII+4i5JpnXsctbOJ62uI=',
	        'index.html': 'sha256-+scCgn7Eo+mhrGavMgsx33BWTBr0/qHszUk6SOgTWFA=',
	        'assets/typefaces.scss': 'sha256-bYMNS2h/P0zqvTfGsqs/tDR3z6Y71onV8dD8JECaGOU=',
	        'assets/topbar.scss': 'sha256-RG81iqKJUzNX+A6BybTepUxx1IlibDeGSnFiBDXVw90=',
	        'trace_to_text.wasm': 'sha256-SkwOu/7VgIoqXqdXzQMliCuy4Ju159KtVtn1kdQ3tes=',
	        'assets/catapult_trace_viewer.html': 'sha256-wLrVZQID01LZXrQygBUzpUlJcvHKCcoetygA1jrOjj8=',
	        'engine_bundle.js': 'sha256-cR/9Jz991nRh46qO8EmnIlZYC+XbYW48+EHAUH8qSVE=',
	        'assets/rec_atrace.png': 'sha256-dIcpPtIGrnXSgJcwmLcsbwsg3ckX7msQ7b81ct3TnYc=',
	        'frontend_bundle.js.map': 'sha256-lGgApxcoQ8jSIhwbmS+OZRKpHMPryJE4DiVdSTXM+Q8=',
	        'controller_bundle.js.map': 'sha256-zhJNfTL2paJFrW0WwxfeYEhxmert+UpAo7ufigv2AiU=',
	        'trace_processor.wasm': 'sha256-2F0ajNSqlFReFroYgAkTpuChTrGASo3lJsAJDyQRiFg=',
	        'assets/favicon.png': 'sha256-0kge5x4UIrS2BqOEKGzZd9l7thrAOJsoiliiwpfn4aE=',
	        'assets/sidebar.scss': 'sha256-3B+XIAlIwyamVX0PnYjIQiVMlLNwmF1M+Zq0kDFsElc=',
	        'assets/rec_native_heap_profiler.png': 'sha256-u7omLys+opSmE/DJZjSzSoJdKh0zcsg9LxWo9IhBg9Q=',
	    },
	    hex_digest: 'dad8c6f6dda4b2de55e0c82111f53cd15bb5caa05c67ca8f2254038dd25b656c',
	};

	});

	var service_worker = createCommonjsModule(function (module, exports) {
	// Copyright (C) 2020 The Android Open Source Project
	//
	// Licensed under the Apache License, Version 2.0 (the "License");
	// you may not use this file except in compliance with the License.
	// You may obtain a copy of the License at
	//
	//      http://www.apache.org/licenses/LICENSE-2.0
	//
	// Unless required by applicable law or agreed to in writing, software
	// distributed under the License is distributed on an "AS IS" BASIS,
	// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	// See the License for the specific language governing permissions and
	// limitations under the License.
	Object.defineProperty(exports, "__esModule", { value: true });

	// This script handles the caching of the UI resources, allowing it to work
	// offline (as long as the UI site has been visited at least once).
	// Design doc: http://go/perfetto-offline.
	// When a new version of the UI is released (e.g. v1 -> v2), the following
	// happens on the next visit:
	// 1. The v1 (old) service worker is activated (at this point we don't know yet
	//    that v2 is released).
	// 2. /index.html is requested. The SW intercepts the request and serves
	//    v1 from cache.
	// 3. The browser checks if a new version of service_worker.js is available. It
	//    does that by comparing the bytes of the current and new version.
	// 5. service_worker.js v2 will not be byte identical with v1, even if v2 was a
	//    css-only change. This is due to the hashes in UI_DIST_MAP below. For this
	//    reason v2 is installed in the background (it takes several seconds).
	// 6. The 'install' handler is triggered, the new resources are fetched and
	//    populated in the cache.
	// 7. The 'activate' handler is triggered. The old caches are deleted at this
	//    point.
	// 8. frontend/index.ts (in setupServiceWorker()) is notified about the activate
	//    and shows a notification prompting to reload the UI.
	//
	// If the user just closes the tab or hits refresh, v2 will be served anyways
	// on the next load.
	// UI_DIST_FILES is map of {file_name -> sha1}.
	// It is really important that this map is bundled directly in the
	// service_worker.js bundle file, as it's used to cause the browser to
	// re-install the service worker and re-fetch resources when anything changes.
	// This is why the map contains the SHA1s even if we don't directly use them in
	// the code (because it makes the final .js file content-dependent).

	const CACHE_NAME = 'dist-' + dist_file_map.UI_DIST_MAP.hex_digest.substr(0, 16);
	const LOG_TAG = `ServiceWorker[${dist_file_map.UI_DIST_MAP.hex_digest.substr(0, 16)}]: `;
	function shouldHandleHttpRequest(req) {
	    // Suppress warning: 'only-if-cached' can be set only with 'same-origin' mode.
	    // This seems to be a chromium bug. An internal code search suggests this is a
	    // socially acceptable workaround.
	    if (req.cache === 'only-if-cached' && req.mode !== 'same-origin') {
	        return false;
	    }
	    const url = new URL(req.url);
	    return req.method === 'GET' && url.origin === self.location.origin;
	}
	function handleHttpRequest(req) {
	    return tslib.__awaiter(this, void 0, void 0, function* () {
	        if (!shouldHandleHttpRequest(req)) {
	            throw new Error(LOG_TAG + `${req.url} shouldn't have been handled`);
	        }
	        // We serve from the cache even if req.cache == 'no-cache'. It's a bit
	        // contra-intuitive but it's the most consistent option. If the user hits the
	        // reload button*, the browser requests the "/" index with a 'no-cache' fetch.
	        // However all the other resources (css, js, ...) are requested with a
	        // 'default' fetch (this is just how Chrome works, it's not us). If we bypass
	        // the service worker cache when we get a 'no-cache' request, we can end up in
	        // an inconsistent state where the index.html is more recent than the other
	        // resources, which is undesirable.
	        // * Only Ctrl+R. Ctrl+Shift+R will always bypass service-worker for all the
	        // requests (index.html and the rest) made in that tab.
	        try {
	            const cacheOps = { cacheName: CACHE_NAME };
	            const cachedRes = yield caches.match(req, cacheOps);
	            if (cachedRes) {
	                console.debug(LOG_TAG + `serving ${req.url} from cache`);
	                return cachedRes;
	            }
	            console.warn(LOG_TAG + `cache miss on ${req.url}`);
	        }
	        catch (exc) {
	            console.error(LOG_TAG + `Cache request failed for ${req.url}`, exc);
	        }
	        // In any other case, just propagate the fetch on the network, which is the
	        // safe behavior.
	        console.debug(LOG_TAG + `falling back on network fetch() for ${req.url}`);
	        return fetch(req);
	    });
	}
	// The install() event is fired:
	// - The very first time the site is visited, after frontend/index.ts has
	//   executed the serviceWorker.register() method.
	// - *After* the site is loaded, if the service_worker.js code
	//   has changed (because of the hashes in UI_DIST_MAP, service_worker.js will
	//   change if anything in the UI has changed).
	self.addEventListener('install', event => {
	    const doInstall = () => tslib.__awaiter(void 0, void 0, void 0, function* () {
	        if (yield caches.has('BYPASS_SERVICE_WORKER')) {
	            // Throw will prevent the installation.
	            throw new Error(LOG_TAG + 'skipping installation, bypass enabled');
	        }
	        console.log(LOG_TAG + 'installation started');
	        const cache = yield caches.open(CACHE_NAME);
	        const urlsToCache = [];
	        for (const [file, integrity] of Object.entries(dist_file_map.UI_DIST_MAP.files)) {
	            const reqOpts = { cache: 'reload', mode: 'same-origin', integrity };
	            urlsToCache.push(new Request(file, reqOpts));
	            if (file === 'index.html' && location.host !== 'storage.googleapis.com') {
	                // Disable cachinig of '/' for cases where the UI is hosted on GCS.
	                // GCS doesn't support auto indexes. GCS returns a 404 page on / that
	                // fails the integrity check.
	                urlsToCache.push(new Request('/', reqOpts));
	            }
	        }
	        yield cache.addAll(urlsToCache);
	        console.log(LOG_TAG + 'installation completed');
	        // skipWaiting() still waits for the install to be complete. Without this
	        // call, the new version would be activated only when all tabs are closed.
	        // Instead, we ask to activate it immediately. This is safe because each
	        // service worker version uses a different cache named after the SHA256 of
	        // the contents. When the old version is activated, the activate() method
	        // below will evict the cache for the old versions. If there is an old still
	        // opened, any further request from that tab will be a cache-miss and go
	        // through the network (which is inconsitent, but not the end of the world).
	        self.skipWaiting();
	    });
	    event.waitUntil(doInstall());
	});
	self.addEventListener('activate', (event) => {
	    console.warn(LOG_TAG + 'activated');
	    const doActivate = () => tslib.__awaiter(void 0, void 0, void 0, function* () {
	        // Clear old caches.
	        for (const key of yield caches.keys()) {
	            if (key !== CACHE_NAME)
	                yield caches.delete(key);
	        }
	        // This makes a difference only for the very first load, when no service
	        // worker is present. In all the other cases the skipWaiting() will hot-swap
	        // the active service worker anyways.
	        yield self.clients.claim();
	    });
	    event.waitUntil(doActivate());
	});
	self.addEventListener('fetch', event => {
	    // The early return here will cause the browser to fall back on standard
	    // network-based fetch.
	    if (!shouldHandleHttpRequest(event.request)) {
	        console.debug(LOG_TAG + `serving ${event.request.url} from network`);
	        return;
	    }
	    event.respondWith(handleHttpRequest(event.request));
	});

	});

	return service_worker;

}());
//# sourceMappingURL=service_worker.js.map
