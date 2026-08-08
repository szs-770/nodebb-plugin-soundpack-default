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

    // בדיקה האם חלון הצ'אט עבור חדר זה פתוח כעת במסך (בין אם בדף מלא, בחלונית קטנה או גדולה)
    function isChatOpen(roomId) {
        if (!roomId) return false;
        
        // 1. בדיקה אם המשתמש בדף צ'אט מלא של אותו חדר
        if (window.ajaxify && ajaxify.data && ajaxify.data.template) {
            const template = ajaxify.data.template.name || ajaxify.data.template;
            if ((template === 'chats' || template === 'chat') && String(ajaxify.data.roomId) === String(roomId)) {
                return true;
            }
        }
        
        // 2. בדיקה אם קיימת חלונית צ'אט פתוחה במסך עבור חדר זה
        const chatModal = $('[data-room-id="' + roomId + '"]');
        if (chatModal.length > 0) {
            if (chatModal.is(':visible') || !chatModal.hasClass('hidden')) {
                return true;
            }
        }
        
        return false;
    }

    // ניקוי HTML למניעת תגיות מודפסות
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

    // הצגת באנר הטוסט הכחול והמעוצב להודעה חדשה
    function showChatNotificationToast(data) {
        let bodyText = data.bodyShort || '';
        bodyText = stripHTML(bodyText);

        // אם מופיע שם משתמש, נבטיח שהוא מודגש ב-bold
        if (data.fromUser && data.fromUser.username) {
            bodyText = 'הודעה חדשה מ <strong>' + data.fromUser.username + '</strong>';
        } else if (data.user && data.user.username) {
            bodyText = 'הודעה חדשה מ <strong>' + data.user.username + '</strong>';
        } else if (bodyText.indexOf('הודעה חדשה מ ') === 0) {
            const name = bodyText.replace('הודעה חדשה מ ', '').trim();
            bodyText = 'הודעה חדשה מ <strong>' + name + '</strong>';
        }

        alerts.alert({
            type: 'info',
            title: 'הודעה חדשה',
            message: bodyText || 'הודעה חדשה בצ\'אט',
            timeout: 5000,
            clickfn: function () {
                if (data.path) {
                    ajaxify.go(data.path);
                } else if (data.roomId) {
                    ajaxify.go('/chats/' + data.roomId);
                }
            }
        });
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
        // 1. טיפול בהתראות כלליות ובהתראות צ'אט מחוץ לצ'אט
        socket.on('event:new_notification', function (data) {
            const isChatNotif = data && (data.type === 'new-chat' || data.type === 'new-group-chat' || data.type === 'new-public-chat' || (data.path && data.path.startsWith('/chats')));

            if (isChatNotif) {
                // השמעת צליל צ'אט נכנס
                if (config.incomingChatSound) {
                    playAudio(config.incomingChatSound);
                } else if (config.notificationSound) {
                    playAudio(config.notificationSound);
                }

                // אם המשתמש מחוץ לצ'אט, מציגים את באנר ההתראה הכחול והמעוצב
                if (!isChatOpen(data.roomId)) {
                    showChatNotificationToast(data);
                }
            } else {
                // התראה כללית (לייקים, תיוגים, תגובות)
                if (config.notificationSound) {
                    playAudio(config.notificationSound);
                }
            }
        });

        // 2. טיפול בהודעות צ'אט בזמן אמת (בתוך חדר צ'אט)
        socket.on('event:chats.receive', function (data) {
            if (data && app.user && parseInt(data.fromUid, 10) !== parseInt(app.user.uid, 10)) {
                // השמעת צליל צ'אט נכנס
                if (config.incomingChatSound) {
                    playAudio(config.incomingChatSound);
                }

                // מציגים באנר רק אם הצ'אט אינו פתוח במסך (בדף או בחלונית)
                if (!isChatOpen(data.roomId)) {
                    const messageObj = data.message || {};
                    const fromUser = messageObj.fromUser || {};
                    showChatNotificationToast({
                        fromUser: fromUser,
                        roomId: data.roomId,
                        path: '/chats/' + data.roomId
                    });
                }
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