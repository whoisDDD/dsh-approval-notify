window.__ModuleLoader__.load({
	id: "@linxin666/dsh-client-ui-approval-notify",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/core/approval.ts
		function sessionLabel(entry) {
			const title = entry.title?.trim();
			return title === void 0 || title === "" ? entry.displayTitle : title;
		}
		function diffApprovalMessages(snapshot, previous) {
			const nextSeen = /* @__PURE__ */ new Map();
			const messages = [];
			for (const sessionId of snapshot.ids) {
				const entry = snapshot.byId[sessionId];
				const current = entry.pendingInteraction;
				const prior = previous.get(sessionId);
				nextSeen.set(sessionId, current);
				if (current === "approval" && prior !== "approval") messages.push(`会话「${sessionLabel(entry)}」正在等待审批`);
			}
			return {
				messages,
				nextSeen
			};
		}
		//#endregion
		//#region src/client/index.ts
		const TOAST_CLASS = "dsh-approval-toast";
		const TOAST_GAP_MS = 2200;
		const POLL_FALLBACK_MS = 1500;
		let lastSeen = /* @__PURE__ */ new Map();
		let autoHideTimer;
		function showToast(message) {
			const existing = document.querySelector(`.${TOAST_CLASS}`);
			if (existing !== null) existing.remove();
			const el = document.createElement("div");
			el.className = TOAST_CLASS;
			el.textContent = message;
			el.style.cssText = [
				"position:fixed",
				"right:24px",
				"bottom:24px",
				"z-index:2147483647",
				"max-width:320px",
				"padding:10px 14px",
				"border-radius:10px",
				"background:#1d2330",
				"color:#f5f7fb",
				"font:13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Microsoft YaHei\", sans-serif",
				"box-shadow:0 8px 26px rgba(0, 0, 0, 0.28)",
				"border:1px solid rgba(255,255,255,0.08)",
				"white-space:pre-wrap",
				"word-break:break-word"
			].join(";");
			document.body.appendChild(el);
			window.clearTimeout(autoHideTimer);
			autoHideTimer = window.setTimeout(() => {
				el.style.opacity = "0";
				el.style.transform = "translateY(6px)";
				el.style.transition = "opacity 0.2s ease, transform 0.2s ease";
				window.setTimeout(() => el.remove(), 240);
			}, TOAST_GAP_MS);
		}
		function maybeNotify(message) {
			if (!("Notification" in window)) return;
			if (Notification.permission !== "granted") return;
			new Notification("DSH 需要审批", { body: message });
		}
		function runCheck(ctx) {
			const { messages, nextSeen } = diffApprovalMessages(ctx.sessions.list.getSnapshot(), lastSeen);
			lastSeen = nextSeen;
			if (messages.length === 0) return;
			const body = messages.join("\n");
			showToast(body);
			maybeNotify(body);
		}
		const inject = ["sessions"];
		function apply(ctx) {
			ctx.effect(() => {
				const sync = () => {
					runCheck(ctx);
				};
				sync();
				const unsubscribe = ctx.sessions.list.subscribe(sync);
				const timer = window.setInterval(sync, POLL_FALLBACK_MS);
				return () => {
					unsubscribe();
					window.clearInterval(timer);
					window.clearTimeout(autoHideTimer);
					lastSeen = /* @__PURE__ */ new Map();
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