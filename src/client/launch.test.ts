import { describe, expect, beforeEach, afterEach, it, vi } from 'vitest';
import { LaunchSettings } from '../types';
import { STATE_KEY_PREFIX } from '../libs/constants';
import { ltiLaunch  } from './launch';

interface EventError {
  code: string;
  message: string;
}

interface LtiPlatformStorageEvent {
  data: {
    subject: string;
    message_id: string;
    error?: EventError;
    errormessage?: string;
    value: string;
  };
  origin: string;
}

describe('launch', () => {
  const state = 'thestate';
  const platformOIDCUrl = 'https://canvas.instructure.com/api/lti/authorize_redirect';
  const origin = new URL(platformOIDCUrl).origin;
  let event: LtiPlatformStorageEvent;
  let settings: LaunchSettings;

  beforeEach(() => {
    document.body.innerHTML = `
      <form action="https://assessments.atomicjolt.xyz/lti_launches/" method="POST">
          <input type="hidden" name="state" id="state" value="state" />
          <input type="hidden" name="id_token" id="id_token" value="id_token" />
      </form>
      <div id="error" class="hidden">error</div>
    `;

    settings = {
      state,
      stateVerified: false,
      idToken: '',
      ltiStorageParams: {
        target: '_parent',
        originSupportBroken: true,
        platformOIDCUrl,
      },
    };

    event = {
      data: {
        subject: 'lti.get_data.response',
        message_id: state,
        value: state,
      },
      origin,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = `${STATE_KEY_PREFIX}${state}=;Max-Age=-1`;
  });

  describe('validateLaunch', () => {
    it('calls postMessage', async () => {
      // Spy on postMessage to ensure it is called.
      const postMessageSpy = vi.spyOn(window, 'postMessage');

      // Spy on addEventListener mock the response that will be sent to receiveMessage
      vi.spyOn(window, 'addEventListener').mockImplementation((eventName, func) => {
        if (eventName === 'message') {
          const receiveMessage = func as Function;
          receiveMessage(event);
        }
        if (eventName === 'load') {
          const f = func as Function;
          f();
        }
      });

      await expect(ltiLaunch(settings)).resolves.toBeTruthy();
      await new Promise(process.nextTick);
      expect(postMessageSpy).toHaveBeenCalled();
    });

    it('returns false if the state is invalid', async () => {
      // Spy on postMessage to ensure it is called.
      const postMessageSpy = vi.spyOn(window, 'postMessage');

      // Spy on addEventListener mock the response that will be sent to receiveMessage
      vi.spyOn(window, 'addEventListener').mockImplementation((eventName, func) => {
        if (eventName === 'message') {
          const receiveMessage = func as Function;
          event.data.value = 'badstate';
          receiveMessage(event);
        }
        if (eventName === 'load') {
          const f = func as Function;
          f();
        }
      });
      await expect(ltiLaunch(settings)).resolves.toBeFalsy();
      await new Promise(process.nextTick);
      expect(postMessageSpy).toHaveBeenCalled();
    });

    it('should return false when there is no ltiStorageParams', async () => {
      const settings: LaunchSettings = {
        state: 'testState',
        ltiStorageParams: null
      };
      // Spy on addEventListener mock the response that will be sent to receiveMessage
      vi.spyOn(window, 'addEventListener').mockImplementation((eventName, func) => {
        if (eventName === 'load') {
          const f = func as Function;
          f();
        }
      });
      await expect(ltiLaunch(settings)).resolves.toBeFalsy();
    });
  });

});
