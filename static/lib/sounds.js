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
        
        // 2. בדיקה אם קיימת חלונית צ'אט (קטנה או גדולה) במסך עבור חדר זה
        const chatModal = $('[data-room-id="' + roomId + '"]');
        if (chatModal.length > 0) {
            if (chatModal.is(':visible') || !chatModal.hasClass('hidden')) {
                return true;
            }
        }
        
        return false;
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
        // 1. צליל התראה כללית (לייקים, תיוגים, תגובות)
        socket.on('event:new_notification', function () {
            if (config.notificationSound) {
                playAudio(config.notificationSound);
            }
        });

        // 2. טיפול בהודעות צ'אט נכנסות
        socket.on('event:chats.receive', function (data) {
            if (data && app.user && parseInt(data.fromUid, 10) !== parseInt(app.user.uid, 10)) {
                // השמעת צליל צ'אט נכנס בכל מקרה
                if (config.incomingChatSound) {
                    playAudio(config.incomingChatSound);
                }

                // הצגת באנר ההתראה הכחול אך ורק אם הצ'אט אינו פתוח כעת במסך (בחלונית או בדף מלא)
                if (!isChatOpen(data.roomId)) {
                    const messageObj = data.message || {};
                    const fromUser = messageObj.fromUser || {};
                    const username = fromUser.username || 'משתמש';

                    alerts.alert({
                        type: 'info',
                        title: 'הודעה חדשה',
                        message: 'הודעה חדשה מ <strong>' + username + '</strong>',
                        timeout: 5000,
                        clickfn: function () {
                            ajaxify.go('/chats/' + data.roomId);
                        }
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