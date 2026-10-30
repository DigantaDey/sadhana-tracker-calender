package app.sadhana.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.ui.theme.LocalSadhanaColors

@Composable
fun Hairline(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(LocalSadhanaColors.current.hairline)
    )
}

@Composable
fun GlyphBadge(
    glyph: String,
    color: Color,
    size: Dp = 34.dp,
    fontSize: Int = 15,
) {
    Box(
        Modifier
            .size(size)
            .clip(RoundedCornerShape(size / 3))
            .background(color.copy(alpha = 0.13f))
            .border(1.dp, color.copy(alpha = 0.22f), RoundedCornerShape(size / 3)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = glyph,
            color = color,
            fontSize = fontSize.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    action: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        action?.invoke()
    }
}

@Composable
fun StatCard(
    label: String,
    value: String,
    unit: String? = null,
    sub: String? = null,
    accent: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val extras = LocalSadhanaColors.current
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(if (accent) extras.accentSoft else MaterialTheme.colorScheme.surface)
            .border(1.dp, if (accent) MaterialTheme.colorScheme.primary.copy(alpha = 0.22f) else extras.hairline, RoundedCornerShape(14.dp))
            .padding(horizontal = 12.dp, vertical = 12.dp)
    ) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1,
        )
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                value,
                style = app.sadhana.ui.theme.StatNumberStyle,
                color = if (accent) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            )
            unit?.let {
                Text(
                    it,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 2.dp, bottom = 3.dp),
                )
            }
        }
        sub?.let {
            Text(
                it,
                fontSize = 10.5.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
fun Chip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val extras = LocalSadhanaColors.current
    Box(
        modifier
            .clip(CircleShape)
            .background(if (selected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.surface)
            .border(
                1.dp,
                if (selected) Color.Transparent else extras.hairline,
                CircleShape,
            )
            .clickable { onClick() }
            .padding(horizontal = 13.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            fontSize = 12.5.sp,
            fontWeight = FontWeight.Medium,
            color = if (selected) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun BarTrack(fraction: Float, color: Color, modifier: Modifier = Modifier, height: Dp = 4.dp) {
    Box(
        modifier
            .fillMaxWidth()
            .height(height)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Box(
            Modifier
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .height(height)
                .clip(CircleShape)
                .background(color)
        )
    }
}

@Composable
fun EmptyState(title: String, body: String) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, LocalSadhanaColors.current.hairline, RoundedCornerShape(16.dp))
            .padding(horizontal = 20.dp, vertical = 30.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("◦", fontSize = 26.sp, color = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.height(6.dp))
        Text(title, style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(4.dp))
        Text(
            body,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun Dot(active: Boolean, color: Color = MaterialTheme.colorScheme.primary, size: Dp = 5.dp) {
    Box(
        Modifier
            .size(size)
            .clip(CircleShape)
            .background(if (active) color else LocalSadhanaColors.current.hairline)
    )
}

@Composable
fun VSpace(height: Dp) = Spacer(Modifier.height(height))

@Composable
fun HSpace(width: Dp) = Spacer(Modifier.width(width))
