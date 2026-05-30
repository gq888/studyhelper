package cn.studyhelper.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ArrayList<Class<? extends Plugin>> additionalPlugins = new ArrayList<>();
        additionalPlugins.add(com.getcapacitor.app.App.class);
        additionalPlugins.add(com.getcapacitor.splashscreen.SplashScreen.class);
        additionalPlugins.add(com.getcapacitor.statusbar.StatusBar.class);
        additionalPlugins.add(com.getcapacitor.localnotifications.LocalNotifications.class);
        registerPlugins(additionalPlugins);
    }
}
