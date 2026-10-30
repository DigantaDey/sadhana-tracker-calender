package app.sadhana.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.sadhana.domain.PLACES
import app.sadhana.domain.Settings

/**
 * First run. Three quiet screens, no tour, no permissions asked up front.
 * Nothing is created here — the user writes the first vow themselves.
 */
@Composable
fun OnboardingScreen(
    settings: Settings,
    onUpdate: ((Settings) -> Settings) -> Unit,
    onDone: () -> Unit,
) {
    var step by remember { mutableStateOf(0) }
    val scroll = rememberScrollState()

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(horizontal = 26.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.Start,
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(
                "SĀDHANA",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                (0..2).forEach { index ->
                    Box(
                        Modifier
                            .size(if (index == step) 6.dp else 5.dp)
                            .clip(CircleShape)
                            .background(
                                if (index <= step) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                    )
                }
            }
        }

        Spacer(Modifier.height(52.dp))

        when (step) {
            0 -> {
                Text("A vow, kept\nquietly.", style = MaterialTheme.typography.displaySmall)
                Text(
                    "Sādhana is a record of what you promised yourself and how often you kept it. " +
                        "No feed, no streak-shaming, nothing leaves this device.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 16.dp).widthIn(max = 340.dp),
                )
                Spacer(Modifier.height(28.dp))
                OutlinedTextField(
                    value = settings.name,
                    onValueChange = { name -> onUpdate { it.copy(name = name.take(40)) } },
                    label = { Text("How should the greeting address you?") },
                    placeholder = { Text("Leave blank if you prefer") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(
                        capitalization = KeyboardCapitalization.Words,
                        imeAction = ImeAction.Done,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            1 -> {
                Text("Where do you\nsit?", style = MaterialTheme.typography.displaySmall)
                Text(
                    "A tithi runs from sunrise to sunrise, so the pañcāṅga needs a place. " +
                        "It is used only to compute sunrise — nothing is looked up online.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 16.dp).widthIn(max = 340.dp),
                )
                Spacer(Modifier.height(20.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    PLACES.take(12).forEach { place ->
                        val selected = settings.panchang.id == place.id
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    if (selected) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surface
                                )
                                .border(
                                    1.dp,
                                    if (selected) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surfaceVariant,
                                    RoundedCornerShape(12.dp),
                                )
                                .clickable { onUpdate { it.copy(panchang = place) } }
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                place.label,
                                style = MaterialTheme.typography.titleSmall,
                                color = if (selected) MaterialTheme.colorScheme.background
                                else MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                place.zone.id.substringAfterLast('/').replace('_', ' '),
                                fontSize = 11.sp,
                                color = if (selected) MaterialTheme.colorScheme.background
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                Text(
                    "More places in Settings.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
            else -> {
                Text("Begin with\none vow.", style = MaterialTheme.typography.displaySmall)
                Text(
                    "Tomorrow the app asks one question: did you keep it? " +
                        "That is the whole loop — a mark, a count, a short note when you have something to say.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 16.dp).widthIn(max = 340.dp),
                )
                Spacer(Modifier.height(18.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Point("Nothing is pre-filled", "Your diary, your vows — a fresh install is genuinely empty.")
                    Point("Offline by design", "Everything is computed and stored on this device.")
                    Point("Pañcāṅga, not a guess", "Tithi, nakṣatra and yoga from the real lunar series.")
                }
                Spacer(Modifier.height(20.dp))
                Text(
                    "A little, every day — that is the whole method.",
                    style = MaterialTheme.typography.bodySmall,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(40.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            if (step > 0) {
                Text(
                    "Back",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.clickable { step -= 1 }.padding(vertical = 10.dp, horizontal = 2.dp),
                )
            } else {
                Spacer(Modifier.height(1.dp))
            }
            Row(
                Modifier
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable {
                        if (step < 2) step += 1
                        else {
                            onUpdate { it.copy(onboarded = true) }
                            onDone()
                        }
                    }
                    .padding(horizontal = 22.dp, vertical = 13.dp),
            ) {
                Text(
                    if (step < 2) "Continue" else "Begin",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.background,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun Point(title: String, body: String) {
    Column(Modifier.fillMaxWidth()) {
        Text(title, style = MaterialTheme.typography.titleSmall)
        Text(
            body,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
