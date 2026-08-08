'use strict';

/* globals config, app, socket, Audio, $, ajaxify */

require(['hooks'], function (hooks) {
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

        // 2. צליל הודעת צ'אט נכנסת
        socket.on('event:chats.receive', function (data) {
            if (data && app.user && parseInt(data.fromUid, 10) !== parseInt(app.user.uid, 10)) {
                if (config.incomingChatSound) {
                    playAudio(config.incomingChatSound);
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