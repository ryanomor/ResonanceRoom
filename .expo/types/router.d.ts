/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/home` | `/(tabs)/matches` | `/(tabs)/notifications` | `/(tabs)/profile` | `/_sitemap` | `/auth` | `/auth/login` | `/auth/signup` | `/auth/social-profile` | `/home` | `/matches` | `/notifications` | `/profile` | `/room/create`;
      DynamicRoutes: `/chat/${Router.SingleRoutePart<T>}` | `/game/${Router.SingleRoutePart<T>}` | `/room/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/chat/[id]` | `/game/[id]` | `/room/[id]`;
    }
  }
}
