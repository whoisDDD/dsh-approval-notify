window.__ModuleLoader__.load({
	id: "@whoisddd/dsh-approval-notify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/core/alert.ts
		function alertPartsOf(message) {
			const [title, body] = message.split("：", 2);
			return {
				title: title === void 0 || title.length === 0 ? "DSH 提示" : title,
				body: body === void 0 || body.length === 0 ? message : body
			};
		}
		//#endregion
		//#region src/core/approval.ts
		function sessionLabel(entry) {
			const title = entry.title?.trim();
			return title === void 0 || title === "" ? entry.displayTitle : title;
		}
		function attentionStatusOf(entry) {
			if (entry.pendingInteraction !== void 0) return entry.pendingInteraction;
			if (entry.completed === true) return "completed";
		}
		function completedMessageFor(entry, label) {
			if (entry.origin === "subagent" || entry.parentId !== void 0) return `子代理已完成：会话「${label}」已完成`;
			return `已完成：会话「${label}」已完成`;
		}
		function messageFor(entry, status) {
			const label = sessionLabel(entry);
			switch (status) {
				case "approval": return `审批请求：会话「${label}」正在等待审批`;
				case "question": return `提问请求：会话「${label}」正在等待你的选择`;
				case "plan-review": return `计划审核：会话「${label}」正在等待确认`;
				case "completed": return completedMessageFor(entry, label);
				default: return;
			}
		}
		function diffApprovalMessages(snapshot, previous) {
			const nextSeen = /* @__PURE__ */ new Map();
			const messages = [];
			for (const sessionId of snapshot.ids) {
				const entry = snapshot.byId[sessionId];
				const current = attentionStatusOf(entry);
				const prior = previous.get(sessionId);
				nextSeen.set(sessionId, current);
				if (current !== void 0 && prior !== current) {
					const message = messageFor(entry, current);
					if (message !== void 0) messages.push(message);
				}
			}
			return {
				messages,
				nextSeen
			};
		}
		//#endregion
		//#region src/client/index.ts
		const TOAST_ROOT_ID = "dsh-approval-toast-root";
		const TOAST_ITEM_CLASS = "dsh-approval-toast";
		const TOAST_LIFETIME_MS = 12e3;
		const POLL_FALLBACK_MS = 1500;
		const BOOT_NOTICE = "approval-notify 已加载";
		let lastSeen = /* @__PURE__ */ new Map();
		let bootNoticeShown = false;
		let permissionPrompt;
		let toastTimers = [];
		function ensureToastRoot() {
			let root = document.getElementById(TOAST_ROOT_ID);
			if (root !== null) return root;
			root = document.createElement("div");
			root.id = TOAST_ROOT_ID;
			root.style.cssText = [
				"position:fixed",
				"right:24px",
				"bottom:24px",
				"display:flex",
				"flex-direction:column-reverse",
				"align-items:flex-end",
				"gap:12px",
				"z-index:2147483646",
				"max-width:min(420px, calc(100vw - 48px))",
				"pointer-events:none"
			].join(";");
			document.body.appendChild(root);
			return root;
		}
		function createToast(title, body) {
			const root = ensureToastRoot();
			const el = document.createElement("div");
			el.className = TOAST_ITEM_CLASS;
			el.innerHTML = `
    <div style="font-size:13px;font-weight:700;line-height:1.4;margin-bottom:6px;color:#ffd15c">${escapeHtml(title)}</div>
    <div style="font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:#f5f7fb">${escapeHtml(body)}</div>
  `;
			el.style.cssText = [
				"min-width:280px",
				"max-width:420px",
				"padding:14px 16px",
				"border-radius:14px",
				"background:rgba(24, 28, 36, 0.96)",
				"color:#f5f7fb",
				"border:1px solid rgba(255,255,255,0.12)",
				"box-shadow:0 12px 34px rgba(0, 0, 0, 0.38)",
				"backdrop-filter:blur(8px)",
				"pointer-events:auto"
			].join(";");
			root.appendChild(el);
			const timer = window.setTimeout(() => {
				el.style.opacity = "0";
				el.style.transform = "translateY(8px)";
				el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
				window.setTimeout(() => el.remove(), 260);
			}, TOAST_LIFETIME_MS);
			toastTimers.push(timer);
		}
		function escapeHtml(text) {
			return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
		}
		function showBootNotice() {
			if (bootNoticeShown) return;
			bootNoticeShown = true;
			console.info("[approval-notify] loaded");
			createToast("通知已启用", BOOT_NOTICE);
		}
		async function resolveNotificationPermission() {
			if (!("Notification" in window)) return "denied";
			if (Notification.permission !== "default") return Notification.permission;
			if (permissionPrompt !== void 0) return permissionPrompt;
			permissionPrompt = Notification.requestPermission().finally(() => {
				permissionPrompt = void 0;
			});
			return permissionPrompt;
		}
		async function notifyBrowser(title, message) {
			if (await resolveNotificationPermission() !== "granted") return false;
			try {
				new Notification(title, {
					body: message,
					requireInteraction: true
				});
				return true;
			} catch {
				return false;
			}
		}
		async function renderAlert(message) {
			const { title, body } = alertPartsOf(message);
			if (!await notifyBrowser(title, body)) createToast(title, body);
		}
		function runCheck(ctx) {
			const { messages, nextSeen } = diffApprovalMessages(ctx.sessions.list.getSnapshot(), lastSeen);
			lastSeen = nextSeen;
			if (messages.length === 0) return;
			for (const message of messages) renderAlert(message);
		}
		const inject = ["sessions"];
		function apply(ctx) {
			ctx.effect(() => {
				showBootNotice();
				resolveNotificationPermission();
				const sync = () => {
					runCheck(ctx);
				};
				sync();
				const unsubscribe = ctx.sessions.list.subscribe(sync);
				const timer = window.setInterval(sync, POLL_FALLBACK_MS);
				return () => {
					unsubscribe();
					window.clearInterval(timer);
					for (const item of toastTimers) window.clearTimeout(item);
					toastTimers = [];
					lastSeen = /* @__PURE__ */ new Map();
					bootNoticeShown = false;
					permissionPrompt = void 0;
					document.getElementById(TOAST_ROOT_ID)?.remove();
				};
			}, "approval-notify: watch sessions");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map