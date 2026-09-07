import { getToken } from '@react-native-firebase/app-check';

import {
  appCheckHeaders,
  configureAppCheck,
} from '../src/shared/firebase/appCheck';

const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

describe('the App Check proof on REST calls', () => {
  it('sends nothing before App Check is configured', async () => {
    // A build where the boot never ran behaves exactly as before App Check
    // existed: no header, the server decides.
    expect(await appCheckHeaders()).toEqual({});
  });

  it('sends the token as the header once configured', async () => {
    configureAppCheck();

    expect(await appCheckHeaders()).toEqual({
      'X-Firebase-AppCheck': 'test-app-check-token',
    });
  });

  it('sends nothing when the device cannot attest', async () => {
    // No Play Services, a sideloaded release build, the native side still
    // warming up: the request must still go out, without the header.
    mockedGetToken.mockRejectedValueOnce(new Error('attestation failed'));

    expect(await appCheckHeaders()).toEqual({});
  });
});
