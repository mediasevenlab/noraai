import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const manifest = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../hybrid/android/app/src/main/AndroidManifest.xml'),
  'utf8',
)

test('hybrid APK declares camera and microphone so WebView can grant them', () => {
  expect(manifest).toContain('android.permission.CAMERA')
  expect(manifest).toContain('android.permission.RECORD_AUDIO')
  expect(manifest).toContain('android.permission.MODIFY_AUDIO_SETTINGS')
  expect(manifest).toContain('android.hardware.camera')
  expect(manifest).toContain('android.hardware.microphone')
  expect(manifest).toContain('android:windowSoftInputMode="adjustResize"')
  expect(manifest).toContain('android.media.action.IMAGE_CAPTURE')
  expect(manifest).toContain('android.intent.action.GET_CONTENT')
  expect(manifest).toContain('android:label="@string/app_name"')
  expect(manifest).not.toContain('title_activity_main')
})
