import { expect, test } from 'bun:test'

import { newsChannelHandle, parseTelegramChannelPage } from './telegram-page'

const PAGE = `
<div class="tgme_widget_message_wrap">
  <div class="tgme_widget_message" data-post="bbcnews/100539" data-view="secret">
    <a class="tgme_widget_message_video_player" href="https://t.me/bbcnews/100539">
      <i class="tgme_widget_message_video_thumb" style="background-image:url('https://cdn4.telesco.pe/file/poster.jpg')"></i>
      <video src="https://cdn4.telesco.pe/file/clip.mp4" class="tgme_widget_message_video"></video>
    </a>
    <div class="tgme_widget_message_text js-message_text" dir="auto">Hello <b>world</b><br/>Second&nbsp;line</div>
    <a class="tgme_widget_message_date" href="https://t.me/bbcnews/100539">
      <time datetime="2026-10-20T02:06:40+00:00" class="time">02:06</time>
    </a>
  </div>
</div>
<div class="tgme_widget_message_wrap">
  <div class="tgme_widget_message" data-post="bbcnews/100540">
    <a class="tgme_widget_message_photo_wrap 123 456" href="https://t.me/bbcnews/100540" style="width:800px;background-image:url('https://cdn4.telesco.pe/file/photo.jpg')">
      <div class="tgme_widget_message_photo"></div>
    </a>
    <div class="js-message_text" dir="auto">Photo only</div>
    <time datetime="2026-10-20T03:00:00+00:00"></time>
    <i class="emoji" style="background-image:url('https://telegram.org/img/emoji.png')"></i>
  </div>
</div>
`

test('widget html becomes posts with text, photo, and video', () => {
  const posts = parseTelegramChannelPage(PAGE)
  expect(posts).toHaveLength(2)
  expect(posts[0]).toMatchObject({
    channelHandle: 'bbcnews',
    telegramPostId: 100539,
    text: 'Hello world\nSecond line',
    media: [
      { kind: 'image', url: 'https://cdn4.telesco.pe/file/poster.jpg', role: 'poster' },
      { kind: 'video', url: 'https://cdn4.telesco.pe/file/clip.mp4' },
    ],
  })
  expect(posts[0]?.postedAt.toISOString()).toBe('2026-10-20T02:06:40.000Z')
  expect(posts[1]?.media).toEqual([
    { kind: 'image', url: 'https://cdn4.telesco.pe/file/photo.jpg' },
  ])
})

test('channel links become a handle and invites are rejected', () => {
  expect(newsChannelHandle('https://t.me/s/BBCNews')).toBe('bbcnews')
  expect(newsChannelHandle('@durov')).toBe('durov')
  expect(newsChannelHandle('bbcnews')).toBe('bbcnews')
  expect(newsChannelHandle('https://t.me/+invite')).toBeNull()
  expect(newsChannelHandle('https://example.com/telegram')).toBeNull()
})
