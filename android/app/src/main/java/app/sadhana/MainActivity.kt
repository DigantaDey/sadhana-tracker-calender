package app.sadhana

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import app.sadhana.ui.SadhanaRoot
import app.sadhana.ui.SadhanaViewModel
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val container = (application as SadhanaApp).container

        setContent {
            val vm: SadhanaViewModel = viewModel(
                factory = SadhanaViewModel.factory(container)
            )
            SadhanaRoot(vm)
        }
    }
}
