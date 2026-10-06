package com.menen.oshs;

import android.content.Context;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Exposes the device's ANDROID_ID to the JS layer so the offline verifier can
 * build a stable device code:
 *   window.Capacitor.Plugins.MenenDeviceId.getAndroidId() -> { id, source }
 *
 * No permissions required (Settings.Secure read is unrestricted). The ID is
 * stable across reinstalls and only changes on a factory reset / re-signing.
 */
@CapacitorPlugin(name = "MenenDeviceId")
public class MenenDeviceIdPlugin extends Plugin {

    private static final String TAG = "MenenDeviceId";

    @PluginMethod
    public void getAndroidId(PluginCall call) {
        try {
            Context ctx = getContext();
            String androidId = Settings.Secure.getString(
                    ctx.getContentResolver(),
                    Settings.Secure.ANDROID_ID
            );
            JSObject ret = new JSObject();
            if (androidId != null && !androidId.isEmpty()) {
                ret.put("id", androidId);
                ret.put("source", "android-id");
            } else {
                ret.put("id", "");
                ret.put("source", "unavailable");
            }
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to read ANDROID_ID", e);
            call.reject("ANDROID_ID unavailable", e);
        }
    }
}