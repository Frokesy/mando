# Notification cross-platform verification

Run this matrix against the production-like test database and HTTPS deployment. Use a separate account for each role, plus one multi-role account.

## Desktop

- Chrome and Edge: enable push, confirm welcome notification, background the app, close it, and open the notification deep link.
- Firefox: repeat permission, background, closed-window, and deep-link checks.
- Safari on macOS: repeat where Web Push is supported by the installed version.
- For every browser, verify granted, denied, revoked, and unsupported states on the profile page.

## Android

- Test once in the browser and once after installing the PWA.
- Confirm notification visibility with the app open, backgrounded, and closed.
- Confirm sound follows the device/browser notification settings.
- Confirm each role-specific notification opens only its own dashboard.

## iPhone/iPad

- Add each role-specific PWA to the Home Screen and open that installed PWA before enabling push.
- Confirm the unsupported guidance appears in ordinary Safari where push cannot be enabled.
- Confirm notifications arrive while the installed PWA is backgrounded and closed.
- Confirm sound follows iOS notification and Focus settings.

## Multi-role and trusted devices

- Sign into each role separately and verify the badge and feed contain only that role's notifications.
- Enable trusted-device push for one role, switch roles, and verify subscriptions retain their intended role.
- Disable push, revoke browser permission, and remove a subscription; verify the profile UI and delivery dashboard update appropriately.
- Confirm malicious, external, or wrong-role deep links fall back to the active role's notification page.
