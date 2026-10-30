package app.sadhana.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.domain.ColorKey
import app.sadhana.domain.ThemePref

// ── Raw palette ──────────────────────────────────────────────────────────────

private val Paper = Color(0xFFF2EFE9)
private val PaperCard = Color(0xFFFFFDFA)
private val PaperCardAlt = Color(0xFFF8F5EF)
private val Ink = Color(0xFF17150F)
private val InkSoft = Color(0xFF48433B)
private val Muted = Color(0xFF857C70)
private val Hairline = Color(0xFFE2DCCF)
private val Saffron = Color(0xFFB5741F)
private val SaffronLight = Color(0xFFE5A54C)
private val SaffronSoft = Color(0xFFF7EAD3)
private val Jade = Color(0xFF3F755C)
private val Rose = Color(0xFFA9503C)

private val Night = Color(0xFF0A0A0B)
private val NightCard = Color(0xFF131315)
private val NightCardAlt = Color(0xFF181819)
private val NightLine = Color(0xFF262629)
private val Bone = Color(0xFFF4F0E9)
private val BoneSoft = Color(0xFFC6C0B7)
private val NightMuted = Color(0xFF8B857C)
private val SaffronNight = Color(0xFFECB877)
private val SaffronNightSoft = Color(0xFF241C12)
private val JadeNight = Color(0xFF81B89D)
private val RoseNight = Color(0xFFD4907A)

/** Extra surface roles Material3 does not model (hairlines, glyph tints). */
data class SadhanaColors(
    val hairline: Color,
    val cardAlt: Color,
    val accentSoft: Color,
    val jade: Color,
    val rose: Color,
    val isDark: Boolean,
)

val LocalSadhanaColors = staticCompositionLocalOf {
    SadhanaColors(Hairline, PaperCardAlt, SaffronSoft, Jade, Rose, false)
}

private val LightScheme = lightColorScheme(
    primary = Saffron,
    onPrimary = Color.White,
    primaryContainer = SaffronSoft,
    onPrimaryContainer = Color(0xFF5A3A0D),
    secondary = Jade,
    onSecondary = Color.White,
    background = Paper,
    onBackground = Ink,
    surface = PaperCard,
    onSurface = Ink,
    surfaceVariant = PaperCardAlt,
    onSurfaceVariant = InkSoft,
    outline = Hairline,
    outlineVariant = Color(0xFFEDE8DE),
    error = Rose,
)

private val DarkScheme = darkColorScheme(
    primary = SaffronNight,
    onPrimary = Color(0xFF1A1104),
    primaryContainer = SaffronNightSoft,
    onPrimaryContainer = SaffronNight,
    secondary = JadeNight,
    onSecondary = Color(0xFF07130D),
    background = Night,
    onBackground = Bone,
    surface = NightCard,
    onSurface = Bone,
    surfaceVariant = NightCardAlt,
    onSurfaceVariant = BoneSoft,
    outline = NightLine,
    outlineVariant = Color(0xFF202023),
    error = RoseNight,
)

private val base = Typography()

private val SadhanaTypography = Typography(
    displayLarge = base.displayLarge.copy(fontFamily = FontFamily.Serif, fontWeight = FontWeight.Normal),
    displayMedium = base.displayMedium.copy(fontFamily = FontFamily.Serif),
    headlineLarge = base.headlineLarge.copy(fontFamily = FontFamily.Serif, letterSpacing = (-0.4).sp),
    headlineMedium = base.headlineMedium.copy(fontFamily = FontFamily.Serif, letterSpacing = (-0.3).sp),
    headlineSmall = base.headlineSmall.copy(fontFamily = FontFamily.Serif, letterSpacing = (-0.2).sp),
    titleLarge = base.titleLarge.copy(fontFamily = FontFamily.Serif, letterSpacing = (-0.2).sp),
    titleMedium = base.titleMedium.copy(fontWeight = FontWeight.W600, letterSpacing = (-0.1).sp),
    bodyLarge = base.bodyLarge.copy(lineHeight = 24.sp),
    bodyMedium = base.bodyMedium.copy(lineHeight = 21.sp),
    bodySmall = base.bodySmall.copy(lineHeight = 18.sp),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.W600,
        fontSize = 10.5.sp,
        letterSpacing = 1.3.sp,
    ),
    labelLarge = base.labelLarge.copy(fontWeight = FontWeight.W600),
)

@Composable
fun SadhanaTheme(
    themePref: ThemePref = ThemePref.SYSTEM,
    content: @Composable () -> Unit,
) {
    val dark = when (themePref) {
        ThemePref.SYSTEM -> isSystemInDarkTheme()
        ThemePref.LIGHT -> false
        ThemePref.DARK -> true
    }

    val scheme = if (dark) DarkScheme else LightScheme
    val extras = if (dark) {
        SadhanaColors(NightLine, NightCardAlt, SaffronNightSoft, JadeNight, RoseNight, true)
    } else {
        SadhanaColors(Hairline, PaperCardAlt, SaffronSoft, Jade, Rose, false)
    }

    CompositionLocalProvider(LocalSadhanaColors provides extras) {
        MaterialTheme(
            colorScheme = scheme,
            typography = SadhanaTypography,
            content = content,
        )
    }
}

@Composable
fun accentFor(key: ColorKey): Color {
    val dark = LocalSadhanaColors.current.isDark
    return Color(if (dark) key.dark else key.light)
}

val StatNumberStyle = TextStyle(
    fontFamily = FontFamily.Serif,
    fontSize = 26.sp,
    fontWeight = FontWeight.Normal,
    letterSpacing = (-0.4).sp,
)

val HairlineWidth = 1.dp
fun lineHeightStyle() = LineHeightStyle(
    alignment = LineHeightStyle.Alignment.Center,
    trim = LineHeightStyle.Trim.None,
)
