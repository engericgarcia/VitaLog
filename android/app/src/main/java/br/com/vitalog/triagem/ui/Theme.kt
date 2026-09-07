package br.com.vitalog.triagem.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Mesmas cores da versão web, inclusive as três de situação — que foram
 * validadas contra daltonismo lá e não devem divergir aqui. Um prontuário que
 * muda de linguagem visual entre telefone e navegador confunde quem o lê sob
 * pressa.
 */
object Vita {
    val AccentLight = Color(0xFF0D7D78)
    val AccentDark = Color(0xFF2DD4BF)
    val HighLight = Color(0xFFC9490B)
    val HighDark = Color(0xFFE06C1F)
    val NormalLight = Color(0xFF177F45)
    val NormalDark = Color(0xFF20A256)
}

private val Light = lightColorScheme(
    primary = Vita.AccentLight,
    background = Color(0xFFF6F8F9),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFF1F4F6),
    onBackground = Color(0xFF131C26),
    onSurface = Color(0xFF131C26),
    onSurfaceVariant = Color(0xFF5F7080),
    error = Vita.HighLight,
    outline = Color(0xFFCFD8E0),
    outlineVariant = Color(0xFFE3E9EE),
)

private val Dark = darkColorScheme(
    primary = Vita.AccentDark,
    background = Color(0xFF0A0E13),
    surface = Color(0xFF121821),
    surfaceVariant = Color(0xFF1A222D),
    onBackground = Color(0xFFE9EEF4),
    onSurface = Color(0xFFE9EEF4),
    onSurfaceVariant = Color(0xFF93A3B3),
    error = Vita.HighDark,
    outline = Color(0xFF33404F),
    outlineVariant = Color(0xFF232D3A),
)

@Composable
fun VitalogTheme(
    dark: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
}

@Composable
fun highColor(): Color = if (isSystemInDarkTheme()) Vita.HighDark else Vita.HighLight

@Composable
fun normalColor(): Color = if (isSystemInDarkTheme()) Vita.NormalDark else Vita.NormalLight
