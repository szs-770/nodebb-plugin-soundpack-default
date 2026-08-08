'use strict';

/* globals config, app, socket, Audio, $, ajaxify */

require(['hooks', 'alerts'], function (hooks, alerts) {
    const cache = {};

    function playAudio(file) {
        if (!file) return;
        const soundUrl = config.relative_path + '/assets/plugins/nodebb-plugin-soundpack-default/sounds/' + file;
        
        try {
            if (!cache[file]) {
                cache[file] = new Audio(soundUrl);
            }
            const audio = cache[file];
            audio.pause();
            audio.currentTime = 0;
            audio.play().catch(function (err) {
                console.warn('[soundpack] Playback error:', err);
            });
        } catch (err) {
            console.warn('[soundpack] Audio error:', err);
        }
    }

    // פונקציה לניקוי מוחלט של תגיות HTML מתוכן ההודעה (למניעת הצגת קוד HTML)
    function stripHTML(html) {
        if (!html) return '';
        try {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || html.replace(/<[^>]*>?/gm, '').trim();
        } catch (e) {
            return html.replace(/<[^>]*>?/gm, '').trim();
        }
    }

    // מאזינים לכפתורי בדיקת צליל בהגדרות החשבון
    $(document).on('click', 'button[data-action="play"]', function (e) {
        e.preventDefault();
        const select = $(this).closest('.d-flex').find('select');
        const soundFile = select.val();
        if (soundFile) {
            playAudio(soundFile);
        }
    });

    if (!window.soundpackInitialized) {
        // 1. צליל התראה כללית
        socket.on('event:new_notification', function () {
            if (config.notificationSound) {
                playAudio(config.notificationSound);
            }
        });

        // 2. טיפול בהודעות צ'אט נכנסות (צליל + התראה כחולה ותקנית ל-NodeBB 4.x)
        socket.on('event:chats.receive', function (data) {
            if (data && app.user && parseInt(data.fromUid, 10) !== parseInt(app.user.uid, 10)) {
                // השמעת צליל צ'אט נכנס
                if (config.incomingChatSound) {
                    playAudio(config.incomingChatSound);
                }

                const messageObj = data.message || {};
                const fromUser = messageObj.fromUser || {};
                const rawContent = messageObj.content || data.content || '';
                const cleanText = stripHTML(rawContent);
                const username = fromUser.username || 'משתמש';

                // התראה כחולה תקנית של NodeBB 4.x (טקסט נקי בלבד ללא תגיות HTML)
                alerts.alert({
                    type: 'info',
                    title: 'התראה',
                    message: 'הודעה חדשה מ ' + username + (cleanText ? ': ' + cleanText : ''),
                    timeout: 5000,
                    clickfn: function () {
                        ajaxify.go('/chats/' + data.roomId);
                    }
                });
            }
        });

        // 3. צליל שליחת הודעת צ'אט
        hooks.on('action:chat.sent', function () {
            if (config.outgoingChatSound) {
                playAudio(config.outgoingChatSound);
            }
        });

        window.soundpackInitialized = true;
    }
});