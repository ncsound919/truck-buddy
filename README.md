# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Cab app — run-tracker & auto-pilot

Full feature + seam map lives in `AGENTS.md`. Short version:

- **Run tracker:** a local on-duty clock starts on "Start Shift"; detention is
  auto-logged per completed stop; a 30-min break and fatigue check-ins are
  tracked (`src/domain/types.ts` → `src/store/flow.tsx`). Real ELD pairing is a
  backend item.
- **Auto-pilot:** preferences are remembered once (`DriverPrefs`, defaults +
  migration in `src/domain/data.ts`) — remembered GPS, auto doc-forward on
  capture, auto end-of-day report, auto fault→fleet alert (once/shift), and a
  **gated** consignee arrival text (off by default, explicit consent).
- **Transport is mocked.** OCR/GPS/email/SMS/EOD all run through the
  `TruckBuddyApi` seam (`src/services/truck-buddy-api.ts`); nothing reaches a
  network. A real backend implements the same interface. Label accordingly.
