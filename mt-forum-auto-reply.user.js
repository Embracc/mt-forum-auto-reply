// ==UserScript==
// @name         MT论坛 一键回复看隐藏
// @namespace    https://github.com/Embrace/mt-forum-auto-reply
// @version      2.2.1
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
        version: '2.2.1'
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

        /* ---------- 8b. LV 个人信息按钮 ---------- */
        var lvBtn = document.createElement('div');
        lvBtn.textContent = 'LV';
        lvBtn.id = 'mt_lv';
        lvBtn.title = '查看个人信息与签到';
        lvBtn.style.cssText = 'position:fixed;z-index:2147483646;width:36px;height:36px;' +
            'background:rgba(100,100,100,0.6);color:#fff;' +
            'border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.2);' +
            'cursor:pointer;font-family:sans-serif;font-size:12px;font-weight:bold;' +
            'display:flex;align-items:center;justify-content:center;' +
            'user-select:none;-webkit-user-select:none;' +
            'border:1px solid rgba(255,255,255,0.15);' +
            'transition:opacity 0.3s,transform 0.2s;' +
            'bottom:134px;right:38px;opacity:0;pointer-events:none';

        lvBtn.onclick = function () {
            if (lvBtn._loading) return;
            lvBtn._loading = true;
            lvBtn.style.background = 'rgba(156,163,175,0.6)';
            lvBtn.textContent = '…';

            fetch('https://bbs.binmt.cc/k_misign-sign.html', { credentials: 'include' })
                .then(function (res) { return res.text(); })
                .then(function (html) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(html, 'text/html');
                    var info = {};

                    // 尝试多种选择器提取数据
                    var els = doc.querySelectorAll('li, td, th, dt, dd, p, span, div');
                    var text = '';
                    for (var i = 0; i < els.length; i++) {
                        text += els[i].textContent.trim() + '\n';
                    }

                    // 尝试提取结构化数据
                    var tables = doc.querySelectorAll('table');
                    var tableData = [];
                    for (var i = 0; i < tables.length; i++) {
                        var rows = tables[i].querySelectorAll('tr');
                        for (var j = 0; j < rows.length; j++) {
                            var cells = rows[j].querySelectorAll('th, td');
                            var rowText = [];
                            for (var k = 0; k < cells.length; k++) {
                                rowText.push(cells[k].textContent.trim());
                            }
                            if (rowText.length > 0) tableData.push(rowText.join('  '));
                        }
                    }

                    // 提取用户名
                    var userMatch = text.match(/欢迎\s*(\S+)\s*|(\S+)\s*[，,]\s*您好|uid.*?(\d+)/i);
                    if (userMatch) info.username = userMatch[1] || userMatch[2] || userMatch[3];

                    // 提取签到天数
                    var dayMatch = text.match(/(?:已连续签到|连续签到|已签到)\s*(\d+)\s*天/i);
                    if (dayMatch) info.continuousDays = dayMatch[1];

                    // 提取累计签到
                    var totalMatch = text.match(/(?:累计签到|总共签到|签到总天数)\s*(\d+)\s*天/i);
                    if (totalMatch) info.totalDays = totalMatch[1];

                    // 提取签到等级
                    var rankMatch = text.match(/签到等级[：:]\s*(\S+)/i);
                    if (rankMatch) info.level = rankMatch[1];

                    // 提取今日签到状态
                    var signedMatch = text.match(/今日已签|已签到|签到成功/i);
                    info.signedToday = !!signedMatch;

                    // 提取积分
                    var creditMatch = text.match(/(?:积分|金币|经验)[：:]\s*(\d+)/i);
                    if (creditMatch) info.credit = creditMatch[1];

                    // 提取签到排名
                    var posMatch = text.match(/签到排名[：:]\s*第\s*(\d+)/i);
                    if (posMatch) info.position = posMatch[1];

                    // 从当前页面提取用户名（更可靠）
                    if (!info.username) {
                        var currUser = document.querySelector('.vwmy a, .hdc h2 a, #um p a, a[href*="space-uid"]');
                        if (currUser) info.username = currUser.textContent.trim();
                    }
                    // 从当前页面提取积分
                    if (!info.credit) {
                        var currCredit = document.querySelector('.xg1 a[href*="credit"]');
                        if (currCredit) info.credit = currCredit.textContent.trim();
                    }

                    showInfoModal(info, tableData, doc);
                })
                .catch(function (err) {
                    showInfoModal({ error: '请求失败: ' + err.message }, [], null);
                })
                .finally(function () {
                    lvBtn._loading = false;
                    lvBtn.style.background = 'rgba(100,100,100,0.6)';
                    lvBtn.textContent = 'LV';
                });
        };

        function showInfoModal(info, tableData, doc) {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
                'background:rgba(0,0,0,0.5);z-index:2147483647;display:flex;' +
                'align-items:center;justify-content:center;font-family:sans-serif';

            var modal = document.createElement('div');
            modal.style.cssText = 'background:#fff;border-radius:14px;padding:20px 24px;' +
                'max-width:400px;width:88%;box-shadow:0 8px 30px rgba(0,0,0,0.3);' +
                'text-align:left;max-height:80vh;overflow-y:auto';

            var html = '';

            if (info.error) {
                html += '<div style="text-align:center;padding:20px;">' +
                    '<div style="font-size:40px;margin-bottom:12px;">❌</div>' +
                    '<div style="font-size:14px;color:#666;">' + info.error + '</div></div>';
            } else {
                html += '<div style="border-bottom:1px solid #eee;padding-bottom:14px;margin-bottom:14px;">' +
                    '<div style="font-size:20px;font-weight:bold;color:#333;">' +
                    (info.username || '用户') + '</div>';

                // 签到状态
                var signColor = info.signedToday ? '#10b981' : '#f59e0b';
                var signText = info.signedToday ? '✅ 今日已签到' : '⏳ 今日未签到';
                html += '<div style="font-size:13px;color:' + signColor + ';margin-top:4px;">' + signText + '</div>';
                html += '</div>';

                // 信息行
                var rows = [
                    { label: '连续签到', value: info.continuousDays ? info.continuousDays + ' 天' : '—' },
                    { label: '累计签到', value: info.totalDays ? info.totalDays + ' 天' : '—' },
                    { label: '签到等级', value: info.level || '—' },
                    { label: '签到排名', value: info.position ? '第 ' + info.position + ' 名' : '—' },
                    { label: '积分', value: info.credit || '—' }
                ];

                for (var i = 0; i < rows.length; i++) {
                    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;' +
                        'border-bottom:1px solid #f5f5f5;font-size:14px;">' +
                        '<span style="color:#999;">' + rows[i].label + '</span>' +
                        '<span style="color:#333;font-weight:bold;">' + rows[i].value + '</span></div>';
                }

                // 原始表格数据（如果有额外信息）
                if (tableData && tableData.length > 0) {
                    var extra = [];
                    var known = ['签到', '等级', '积分', '连续', '累计', '排名', '天', '欢迎', '您好', 'uid', 'username'];
                    for (var i = 0; i < tableData.length; i++) {
                        var isKnown = false;
                        for (var k = 0; k < known.length; k++) {
                            if (tableData[i].indexOf(known[k]) !== -1) { isKnown = true; break; }
                        }
                        if (!isKnown && tableData[i].trim().length > 2) extra.push(tableData[i]);
                    }
                    if (extra.length > 0) {
                        html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #eee;">';
                        for (var i = 0; i < extra.length; i++) {
                            html += '<div style="font-size:12px;color:#888;padding:2px 0;">' + extra[i] + '</div>';
                        }
                        html += '</div>';
                    }
                }
            }

            html += '<div style="text-align:center;margin-top:16px;">' +
                '<button id="mt_info_close" style="background:#3b82f6;color:#fff;border:none;' +
                'padding:8px 32px;border-radius:8px;font-size:14px;cursor:pointer;">关闭</button></div>';

            modal.innerHTML = html;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            document.getElementById('mt_info_close').addEventListener('click', function () {
                overlay.remove();
            });
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) overlay.remove();
            });
        }

        // LV 按钮和 ↑ 按钮一起显示/隐藏

        // 显示/隐藏回到顶部和LV按钮
        var scrollCheck = function () {
            if (window.scrollY > 500) {
                topBtn.style.opacity = '1';
                topBtn.style.pointerEvents = 'auto';
                lvBtn.style.opacity = '1';
                lvBtn.style.pointerEvents = 'auto';
            } else {
                topBtn.style.opacity = '0';
                topBtn.style.pointerEvents = 'none';
                lvBtn.style.opacity = '0';
                lvBtn.style.pointerEvents = 'none';
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

            // 超过阈值，但拖拽已结束（dragMoved true, dragging false）→ 残留 mousemove，忽略
            if (dragMoved && !dragging) return;

            // 首次超过阈值 → 激活拖拽
            if (!dragging) {
                dragging = true;
                dragMoved = true;
            }

            // 已激活拖拽 → 跟随鼠标移动
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
            var bottomVal = (window.innerHeight - rect.bottom) + 'px';
            var rightVal = (window.innerWidth - rect.right) + 'px';
            localStorage.setItem('mt_fab_pos', JSON.stringify({
                bottomVal: bottomVal,
                rightVal: rightVal
            }));
            // 恢复 bottom/right 定位，避免后续 mousemove 干扰
            btn.style.bottom = bottomVal;
            btn.style.right = rightVal;
            btn.style.left = 'auto';
            btn.style.top = 'auto';
        }

        // 鼠标事件
        btn.addEventListener('mousedown', function (e) {
            dragStart(e.clientX, e.clientY);
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!btn.style.left || btn.style.left === 'auto') return;
            // 左键没按下 → 忽略（鼠标已松开，残留的 mousemove）
            if (!(e.buttons & 1)) return;
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
        document.body.appendChild(lvBtn);

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