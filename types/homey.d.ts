/**
 * Ambient type declarations for the Homey App SDK v3.
 *
 * The `homey` module is provided by the Homey runtime environment (not from
 * node_modules). These declarations provide TypeScript types for Homey SDK
 * classes used within the app.
 *
 * Reference: https://apps-sdk-v3.developer.homey.app/
 */
declare module 'homey' {
  import { EventEmitter } from 'node:events';

  namespace Homey {
    // -------------------------------------------------------------------------
    // SimpleClass (base for all Homey classes)
    // -------------------------------------------------------------------------
    class SimpleClass {
      log(...args: unknown[]): void;
      error(...args: unknown[]): void;
      debug(...args: unknown[]): void;
    }

    // -------------------------------------------------------------------------
    // App
    // -------------------------------------------------------------------------
    class App extends SimpleClass {
      homey: HomeyInstance;
      onInit(): Promise<void>;
      onUninit(): Promise<void>;
    }

    // -------------------------------------------------------------------------
    // Driver
    // -------------------------------------------------------------------------
    class Driver extends SimpleClass {
      homey: HomeyInstance;
      onInit(): Promise<void>;
      onPair(session: PairSession): Promise<void>;
      getDevices(): Device[];
    }

    // -------------------------------------------------------------------------
    // Device
    // -------------------------------------------------------------------------
    class Device extends SimpleClass {
      homey: HomeyInstance;
      id: string;
      name: string;
      onInit(): Promise<void>;
      onDeleted(): Promise<void>;
      onSettings(event: { newSettings: Record<string, unknown> }): Promise<void>;
      getCapabilityValue(capabilityId: string): unknown;
      setCapabilityValue(capabilityId: string, value: unknown): Promise<void>;
      setAvailable(): Promise<void>;
      setUnavailable(reason?: string): Promise<void>;
      getSettings(): Record<string, unknown>;
      getSetting(key: string): unknown;
      setSettings(settings: Record<string, unknown>): Promise<void>;
      registerCapabilityListener(
        capabilityId: string,
        listener: (value: unknown) => Promise<void>
      ): void;
    }

    // -------------------------------------------------------------------------
    // Flow cards
    // -------------------------------------------------------------------------
    interface FlowCardToken {
      [key: string]: unknown;
    }

    class FlowCardTrigger {
      registerRunListener(listener: (args: unknown, state: unknown) => Promise<boolean>): this;
      trigger(device: Device | null, tokens: FlowCardToken, state?: unknown): Promise<void>;
    }

    class FlowCardCondition {
      registerRunListener(listener: (args: unknown, state: unknown) => Promise<boolean>): this;
    }

    class FlowCardAction {
      registerRunListener(
        listener: (args: unknown, state: unknown) => Promise<FlowCardToken | undefined>
      ): this;
    }

    // -------------------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------------------
    class Notification {
      constructor(options: { excerpt: string });
      register(): Promise<void>;
    }

    // -------------------------------------------------------------------------
    // Homey instance (this.homey inside App/Driver/Device)
    // -------------------------------------------------------------------------
    interface HomeyInstance {
      app: App;
      version: string;
      platform: 'local' | 'cloud';
      flow: {
        getTriggerCard(id: string): FlowCardTrigger;
        getConditionCard(id: string): FlowCardCondition;
        getActionCard(id: string): FlowCardAction;
      };
      notifications: {
        createNotification(notification: Notification): Promise<void>;
      };
      settings: SettingsManager;
    }

    // -------------------------------------------------------------------------
    // Settings
    // -------------------------------------------------------------------------
    interface SettingsManager {
      get(key: string): unknown;
      set(key: string, value: unknown): void;
      unset(key: string): void;
      on(event: 'set', listener: (key: string) => void): this;
    }

    // -------------------------------------------------------------------------
    // Pairing
    // -------------------------------------------------------------------------
    interface PairSession extends EventEmitter {
      showView(viewId: string): Promise<void>;
      nextView(): Promise<void>;
      prevView(): Promise<void>;
      done(): Promise<void>;
      emit(event: string, data?: unknown): boolean;
      on(event: string, listener: (data: unknown) => void): this;
    }

    // -------------------------------------------------------------------------
    // Device data returned from onPairListDevices
    // -------------------------------------------------------------------------
    interface DeviceData {
      name: string;
      data: { id: string };
      settings?: Record<string, unknown>;
      capabilities?: string[];
    }
  }

  export = Homey;
}
