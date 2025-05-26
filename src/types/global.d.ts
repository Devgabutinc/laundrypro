interface Window {
  bluetoothSerial: {
    isConnected: (successCallback: () => void, errorCallback: () => void) => void;
    write: (
      data: ArrayBuffer,
      successCallback: () => void,
      errorCallback: (error: any) => void
    ) => void;
    list: (
      successCallback: (devices: any[]) => void,
      errorCallback: (error: any) => void
    ) => void;
    connect: (
      address: string,
      successCallback: () => void,
      errorCallback: (error: any) => void
    ) => void;
  };
}
