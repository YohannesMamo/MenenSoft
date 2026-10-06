package com.menen.oshs;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MenenDeviceIdPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
