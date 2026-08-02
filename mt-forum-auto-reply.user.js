// ==UserScript==
// @name         MT论坛 一键回复看隐藏
// @namespace    https://github.com/Embrace/mt-forum-auto-reply
// @version      2.1
// @description  可拖拽悬浮按钮，点击自动回复看隐藏。支持触屏拖拽、回到顶部、智能降级
// @author       Embrace
// @match        https://bbs.binmt.cc/thread-*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /* ===== 配置区 ===== */
    var CONFIG = {
        replyPool: [
            '谢谢分享',
            '感谢分享',
            '看看隐藏',
            '感谢分析',
            '学习一下',
            '支持楼主',
            '看看内容',
            '感谢大佬',
            '好贴顶起',
            '涨知识了',
            '收藏了，谢谢',
            '这个不错',
            '学到了',
            '厉害厉害',
            '感谢搬运'
        ],
        dragThreshold: 10,  // px, 超过此距离视为拖拽
        version: '2.1'
    };

    /* ===== 工具函数 ===== */
    function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    /* ===== 主流程 ===== */
    function waitForDOM(cb) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cb);
        } else {
            cb();
        }
    }

    waitForDOM(function () {
        /* ---------- 1. 探测隐藏区域 ---------- */
        function findLocked() {
            var locked = document.querySelector('.locked');
            if (locked) return locked;

            var allDivs = document.querySelectorAll('div');
            for (var i = 0; i < allDivs.length; i++) {
                var d = allDivs[i];
                var text = d.textContent || '';
                if (/隐藏|回复.*可见|只有.*回复/i.test(text) && d.offsetHeight > 0) {
                    var parent = d;
                    while (parent.parentElement && parent.parentElement.textContent === text)
                        parent = parent.parentElement;
                    return parent;
                }
            }

            var postArea = document.querySelector('.t_f, .t_fsz, .plc, .pls, #postlist');
            if (postArea) {
                var els = postArea.querySelectorAll('*');
                for (var i = 0; i < els.length; i++) {
                    if (/隐藏|回复.*可见|只有.*回复/i.test(els[i].textContent || ''))
                        return postArea;
                }
            }

            var walker = document.createTreeWalker(document.body, 4, null, false);
            var node;
            while (node = walker.nextNode()) {
                if (/隐藏|回复.*可见|只有.*回复/i.test(node.textContent || ''))
                    return node.parentElement || node;
            }
            return null;
        }

        var locked = findLocked();
        if (!locked) return;

        /* ---------- 2. 提取 fid/tid ---------- */
        var fid = null, tid = null;
        var scripts = document.querySelectorAll('script');
        for (var i = 0; i < scripts.length; i++) {
            var txt = scripts[i].textContent || '';
            var m1 = txt.match(/var\s+fid\s*=\s*parseInt\s*\(\s*['"]?(\d+)['"]?\s*\)/);
            var m2 = txt.match(/var\s+tid\s*=\s*parseInt\s*\(\s*['"]?(\d+)['"]?\s*\)/);
            if (m1) fid = m1[1];
            if (m2) tid = m2[1];
            if (fid && tid) break;
        }
        if (!tid) {
            var um = location.pathname.match(/thread-(\d+)/);
            if (um) tid = um[1];
        }
        if (!fid || !tid) {
            var link = locked.querySelector('a[href*="fid="]') || document.querySelector('a[href*="fid="]');
            if (link) {
                var href = link.getAttribute('href');
                var mf = href.match(/fid=(\d+)/);
                var mt = href.match(/tid=(\d+)/);
                if (mf) fid = mf[1];
                if (mt) tid = mt[1];
            }
        }
        if (!fid || !tid) return;

        /* ---------- 3. 获取 formhash ---------- */
        var fh = document.querySelector('input[name="formhash"]');
        if (!fh) return;
        var formhash = fh.value;

        /* ---------- 4. 回复状态 ---------- */
        var replyKey = 'mt_replied_' + tid;
        var replied = localStorage.getItem(replyKey);

        /* ---------- 5. 构建回复内容 ---------- */
        function buildReply() {
            var base = randItem(CONFIG.replyPool);
            var title = document.title || '';
            if (title && Math.random() < 0.3) {
                var kw = title.replace(/^.*?[-–—|]\s*/, '').trim();
                if (kw && kw.length > 4 && kw.length < 40) {
                    return base + '，' + kw;
                }
            }
            return base;
        }

        /* ---------- 6. 创建主按钮 ---------- */
        var btn = document.createElement('div');
        btn.textContent = 'M';
        btn.id = 'mt_fab';

        var savedPos = localStorage.getItem('mt_fab_pos');
        var posBottom = '30px', posRight = '30px';
        if (savedPos) {
            try {
                var p = JSON.parse(savedPos);
                if (p && p.bottomVal) posBottom = p.bottomVal;
                if (p && p.rightVal) posRight = p.rightVal;
            } catch(e) {}
        }

        btn.style.cssText = 'position:fixed;z-index:2147483647;width:44px;height:44px;' +
            'background:' + (replied ? '#10b981' : '#3b82f6') + ';color:#fff;' +
            'border-radius:50%;box-shadow:0 3px 12px rgba(0,0,0,0.3);' +
            'cursor:grab;font-family:sans-serif;font-size:20px;font-weight:bold;' +
            'display:flex;align-items:center;justify-content:center;' +
            'user-select:none;-webkit-user-select:none;' +
            'border:2px solid rgba(255,255,255,0.25);' +
            'touch-action:none;' +
            'bottom:' + posBottom + ';right:' + posRight;

        /* ---------- 7. 状态气泡 ---------- */
        var statusEl = document.createElement('div');
        statusEl.style.cssText = 'position:fixed;right:84px;bottom:40px;background:rgba(0,0,0,0.75);color:#fff;' +
            'font-size:13px;padding:6px 12px;border-radius:8px;font-family:sans-serif;' +
            'display:none;z-index:2147483646;pointer-events:none;white-space:nowrap';

        /* ---------- 8. 回到顶部按钮 ---------- */
        var topBtn = document.createElement('div');
        topBtn.textContent = '↑';
        topBtn.id = 'mt_top';
        topBtn.title = '回到顶部';
        topBtn.style.cssText = 'position:fixed;z-index:2147483646;width:36px;height:36px;' +
            'background:rgba(100,100,100,0.6);color:#fff;' +
            'border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.2);' +
            'cursor:pointer;font-family:sans-serif;font-size:18px;font-weight:bold;' +
            'display:flex;align-items:center;justify-content:center;' +
            'user-select:none;-webkit-user-select:none;' +
            'border:1px solid rgba(255,255,255,0.15);' +
            'transition:opacity 0.3s,transform 0.2s;' +
            'bottom:90px;right:38px;opacity:0;pointer-events:none';

        topBtn.onclick = function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // 显示/隐藏回到顶部按钮
        var scrollCheck = function () {
            if (window.scrollY > 500) {
                topBtn.style.opacity = '1';
                topBtn.style.pointerEvents = 'auto';
            } else {
                topBtn.style.opacity = '0';
                topBtn.style.pointerEvents = 'none';
            }
        };
        window.addEventListener('scroll', scrollCheck, { passive: true });

        /* ---------- 9. 拖拽逻辑（含触屏阈值） ---------- */
        var dragging = false;
        var dragData = {};
        var dragMoved = false;

        function dragStart(clientX, clientY) {
            dragging = false;
            dragMoved = false;
            var rect = btn.getBoundingClientRect();
            btn.style.left = rect.left + 'px';
            btn.style.top = rect.top + 'px';
            btn.style.bottom = 'auto';
            btn.style.right = 'auto';
            btn.style.transition = 'none';
            dragData.ox = clientX - rect.left;
            dragData.oy = clientY - rect.top;
            dragData.startX = clientX;
            dragData.startY = clientY;
        }

        function dragMove(clientX, clientY) {
            var dx = Math.abs(clientX - dragData.startX);
            var dy = Math.abs(clientY - dragData.startY);
            if (dx < CONFIG.dragThreshold && dy < CONFIG.dragThreshold) {
                return; // 未超过阈值，视为点击
            }
            dragging = true;
            dragMoved = true;
            var x = Math.max(0, Math.min(window.innerWidth - 44, clientX - dragData.ox));
            var y = Math.max(0, Math.min(window.innerHeight - 44, clientY - dragData.oy));
            btn.style.left = x + 'px';
            btn.style.top = y + 'px';
        }

        function dragEnd() {
            if (!dragging) return;
            dragging = false;
            btn.style.cursor = 'grab';
            btn.style.transition = 'box-shadow 0.2s';
            var rect = btn.getBoundingClientRect();
            localStorage.setItem('mt_fab_pos', JSON.stringify({
                bottomVal: (window.innerHeight - rect.bottom) + 'px',
                rightVal: (window.innerWidth - rect.right) + 'px'
            }));
        }

        // 鼠标事件
        btn.addEventListener('mousedown', function (e) {
            dragStart(e.clientX, e.clientY);
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!btn.style.left || btn.style.left === 'auto') return;
            dragMove(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', function () {
            dragEnd();
        });

        // 触屏事件
        btn.addEventListener('touchstart', function (e) {
            var t = e.touches[0];
            dragStart(t.clientX, t.clientY);
        }, { passive: true });

        btn.addEventListener('touchmove', function (e) {
            e.preventDefault();
            var t = e.touches[0];
            dragMove(t.clientX, t.clientY);
        }, { passive: false });

        btn.addEventListener('touchend', function () {
            dragEnd();
        }, { passive: true });

        document.body.appendChild(statusEl);
        document.body.appendChild(topBtn);

        /* ---------- 10. 统一点击处理（拖拽不触发！） ---------- */
        function handleClick() {
            // ★ 核心：拖拽过则不执行任何点击动作
            if (dragMoved) {
                return;
            }

            if (replied) {
                // 已回复 → 刷新
                location.reload();
                return;
            }

            // 未回复 → 执行回复
            if (loading) return;
            loading = true;
            showStatus('⏳ 回复中', 'rgba(0,0,0,0.75)');
            btn.style.background = '#6b7280';

            var msg = buildReply();
            var url = 'https://bbs.binmt.cc/forum.php?mod=post&action=reply&fid=' + fid +
                '&tid=' + tid + '&extra=page%3D1&replysubmit=yes&infloat=yes&handlekey=fastpost';

            var anim = setInterval(function () {
                var n = parseInt(statusEl.dataset.dots || '0') % 3 + 1;
                statusEl.dataset.dots = n;
                statusEl.textContent = '⏳ 回复中' + '.'.repeat(n);
            }, 400);

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': location.href,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: 'formhash=' + encodeURIComponent(formhash) +
                      '&message=' + encodeURIComponent(msg) +
                      '&replysubmit=yes'
            }).then(function (res) {
                clearInterval(anim);
                if (res.ok) {
                    localStorage.setItem(replyKey, '1');
                    showStatus('✅ 回复成功', 'rgba(16,185,129,0.9)');
                    btn.style.background = '#10b981';
                    setTimeout(function () { location.reload(); }, 1000);
                } else {
                    fallbackReply(msg);
                }
            }).catch(function () {
                clearInterval(anim);
                fallbackReply(msg);
            });
        }

        btn.addEventListener('click', handleClick);

        function showStatus(text, bg) {
            statusEl.style.display = 'block';
            statusEl.textContent = text;
            statusEl.style.background = bg || 'rgba(0,0,0,0.75)';
        }

        function hideStatus() {
            statusEl.style.display = 'none';
        }

        /* ---------- 11. 降级方案 ---------- */
        function fallbackReply(msg) {
            showStatus('⚠️ AJAX 失败，尝试表单提交', 'rgba(239,68,68,0.9)');
            btn.style.background = '#ef4444';

            var fastReplyBtn = document.getElementById('fastpostsubmit') ||
                document.querySelector('a[href*="action=reply"]') ||
                document.querySelector('[id*="fastpost"]');

            if (fastReplyBtn) {
                showStatus('📝 尝试自动回复', 'rgba(245,158,11,0.9)');

                if (typeof fastReplyBtn.click === 'function') {
                    fastReplyBtn.click();
                }

                var retries = 0;
                var tryFill = setInterval(function () {
                    var ta = document.getElementById('fastpostmessage');
                    var submit = document.getElementById('fastpostsubmit');
                    retries++;
                    if (ta && submit) {
                        clearInterval(tryFill);
                        ta.value = msg;
                        submit.click();
                        showStatus('✅ 已提交回复', 'rgba(16,185,129,0.9)');
                        btn.style.background = '#10b981';
                        localStorage.setItem(replyKey, '1');
                        setTimeout(function () { location.reload(); }, 1500);
                    } else if (retries > 10) {
                        clearInterval(tryFill);
                        showManualModal(msg);
                    }
                }, 300);
            } else {
                showManualModal(msg);
            }
        }

        /* ---------- 12. 手动操作引导 ---------- */
        function showManualModal(msg) {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
                'background:rgba(0,0,0,0.5);z-index:2147483647;display:flex;' +
                'align-items:center;justify-content:center;font-family:sans-serif';

            var modal = document.createElement('div');
            modal.style.cssText = 'background:#fff;border-radius:12px;padding:20px 28px;' +
                'max-width:360px;box-shadow:0 8px 30px rgba(0,0,0,0.3);text-align:center';

            modal.innerHTML =
                '<div style="font-size:18px;font-weight:bold;margin-bottom:8px;color:#333;">⚠️ 需要手动回复</div>' +
                '<div style="font-size:14px;color:#666;margin-bottom:16px;line-height:1.5;">' +
                '自动回复失败，请手动回复后点击下方按钮刷新</div>' +
                '<div style="font-size:12px;color:#999;margin-bottom:12px;word-break:break-all;background:#f5f5f5;padding:8px;border-radius:6px;">' +
                '建议回复内容：<br><strong style="color:#3b82f6;">' + msg + '</strong></div>' +
                '<button id="mt_manual_refresh" style="background:#3b82f6;color:#fff;border:none;' +
                'padding:8px 24px;border-radius:8px;font-size:14px;cursor:pointer;margin-right:8px;">' +
                '✅ 已回复，刷新</button>' +
                '<button id="mt_manual_close" style="background:#e5e7eb;color:#333;border:none;' +
                'padding:8px 16px;border-radius:8px;font-size:14px;cursor:pointer;">取消</button>';

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            document.getElementById('mt_manual_refresh').addEventListener('click', function () {
                localStorage.setItem(replyKey, '1');
                location.reload();
            });

            document.getElementById('mt_manual_close').addEventListener('click', function () {
                overlay.remove();
                loading = false;
                btn.style.background = '#3b82f6';
                hideStatus();
            });
        }

        document.body.appendChild(btn);
    });
})();