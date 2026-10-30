package app.sadhana.util

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * A deliberately small markdown renderer for the diary. It understands the
 * subset the app writes itself — headings, quotes, lists, emphasis, `code`,
 * [[wiki links]] and #tags — and renders it with AnnotatedString so there is no
 * HTML, no WebView and nothing to sanitise.
 */
object Markdown {

    fun tags(body: String): List<String> =
        Regex("(^|\\s)#([a-zA-Z][\\w-]{1,30})").findAll(body)
            .map { it.groupValues[2].lowercase() }
            .distinct()
            .toList()

    fun links(body: String): List<String> =
        Regex("\\[\\[([^\\]]+)]]").findAll(body)
            .map { it.groupValues[1].trim() }
            .distinct()
            .toList()

    fun excerpt(body: String, max: Int = 130): String {
        val clean = body
            .replace(Regex("\\[\\[([^\\]|]+)(\\|[^\\]]+)?]]"), "$1")
            .replace(Regex("[#*_>`]"), "")
            .replace(Regex("\\s+"), " ")
            .trim()
        return if (clean.length > max) clean.take(max).trimEnd() + "…" else clean
    }

    private fun styled(text: String) = buildAnnotatedString {
        var cursor = 0
        val regex = Regex("(\\[\\[[^\\]]+]]|\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|`[^`]+`|#\\w+)")
        regex.findAll(text).forEach { match ->
            append(text.substring(cursor, match.range.first))
            val token = match.value
            when {
                token.startsWith("[[") ->
                    withStyle(SpanStyle(color = androidx.compose.ui.graphics.Color(0xFFB5741F), fontWeight = FontWeight.Medium)) {
                        append(token.removePrefix("[[").removeSuffix("]]"))
                    }
                token.startsWith("**") ->
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(token.trim('*')) }
                token.startsWith("`") ->
                    withStyle(SpanStyle(fontFamily = FontFamily.Monospace, fontSize = 13.sp)) {
                        append(token.trim('`'))
                    }
                token.startsWith("#") ->
                    withStyle(SpanStyle(color = androidx.compose.ui.graphics.Color(0xFFB5741F))) { append(token) }
                else ->
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(token.trim('*')) }
            }
            cursor = match.range.last + 1
        }
        append(text.substring(cursor))
    }

    @Composable
    fun Render(body: String, modifier: Modifier = Modifier) {
        Column(modifier) {
            body.split("\n").forEach { raw ->
                val line = raw.trim()
                when {
                    line.isBlank() -> Spacer(Modifier.height(6.dp))
                    line.startsWith("### ") -> Text(
                        line.removePrefix("### "),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    line.startsWith("## ") -> Text(
                        line.removePrefix("## "),
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    line.startsWith("# ") -> Text(
                        line.removePrefix("# "),
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    line.startsWith("> ") -> Text(
                        styled(line.removePrefix("> ")),
                        style = MaterialTheme.typography.bodyLarge,
                        fontStyle = FontStyle.Italic,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    line.startsWith("- ") || line.startsWith("* ") -> Text(
                        styled("•  " + line.drop(2)),
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    else -> Text(
                        styled(line),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}
