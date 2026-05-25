import { CodeSnippet } from './types';

export const kotlinCodeTemplates: CodeSnippet[] = [
  {
    fileName: "MainActivity.kt",
    filePath: "app/src/main/java/com/student/tracker/MainActivity.kt",
    language: "kotlin",
    description: "The primary Activity that holds the Jetpack Compose UI layout, state, and user interactions.",
    code: `package com.student.tracker

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.tracker.ui.theme.StudentExpenseTrackerTheme
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            StudentExpenseTrackerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ExpenseTrackerScreen()
                }
            }
        }
    }
}

// Category enumeration representing available expense options
enum class ExpenseCategory(val label: String, val icon: String, val color: Color) {
    FOOD("Food", "🍔", Color(0xFFFFB74D)),
    TRAVEL("Travel", "🚗", Color(0xFF64B5F6)),
    STUDY("Study", "📚", Color(0xFF81C784)),
    RECHARGE("Recharge", "⚡", Color(0xFFBA68C8)),
    OTHER("Other", "🏷️", Color(0xFF90A4AE))
}

data class Expense(
    val id: String = UUID.randomUUID().toString(),
    val amount: Double,
    val description: String,
    val category: ExpenseCategory,
    val timestamp: Long = System.currentTimeMillis()
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseTrackerScreen() {
    // State management for inputs and list 
    var amountInput by remember { mutableStateOf("") }
    var descriptionInput by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf(ExpenseCategory.FOOD) }
    
    // In memory state for list of student expenses
    val expenses = remember { mutableStateListOf<Expense>() }
    
    // Configurable daily limit budget (default 500 Rupees)
    var dailyLimit by remember { mutableStateOf(500.0) }
    
    // Calc total for today
    val todayTotal = expenses.filter { 
        isToday(it.timestamp) 
    }.sumOf { it.amount }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Student Expense Tracker 🎓",
                        fontWeight = FontWeight.Bold,
                        fontSize = 20sp
                    ) 
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
                .background(MaterialTheme.colorScheme.background),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // "Aaj ka kharcha" (Today's Spending Metric Box)
            SpendingStatusCard(todayTotal = todayTotal, dailyLimit = dailyLimit)

            // ADD EXPENSE FORM
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "Naya Kharcha Daalo",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // "Amount daalo" input field
                    OutlinedTextField(
                        value = amountInput,
                        onValueChange = { amountInput = it },
                        label = { Text("Amount daalo (₹)") },
                        placeholder = { Text("Jaise: 120") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // "Description" input field
                    OutlinedTextField(
                        value = descriptionInput,
                        onValueChange = { descriptionInput = it },
                        label = { Text("Kahan kharch kiya?") },
                        placeholder = { Text("Jaise: Samosa, Bus ticket") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Jetpack Compose Grid of Categories
                    Text(
                        text = "Category select karo:",
                        fontSize = 14sp,
                        fontWeight = FontWeight.Medium
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        ExpenseCategory.values().forEach { cat ->
                            CategoryChip(
                                category = cat,
                                isSelected = selectedCategory == cat,
                                onSelected = { selectedCategory = cat }
                            )
                        }
                    }

                    // "Save expense" button
                    Button(
                        onClick = {
                            val amount = amountInput.toDoubleOrNull()
                            if (amount != null && amount > 0) {
                                val desc = descriptionInput.ifBlank { selectedCategory.label }
                                expenses.add(0, Expense(
                                    amount = amount,
                                    description = desc,
                                    category = selectedCategory
                                ))
                                // Reset fields
                                amountInput = ""
                                descriptionInput = ""
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Text(
                            text = "Save Expense 💾",
                            fontWeight = FontWeight.Bold,
                            fontSize = 16sp
                        )
                    }
                }
            }

            // RECENT EXPENSES HEADER
            Text(
                text = "Recent Kharcha List List 📝",
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.titleLarge
            )

            // LazyColumn (Compose ListView) for list of expenses
            if (expenses.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Koi kharcha nahi hai! Sahi hai, bachat ho rahi hai. 😉",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(expenses, key = { it.id }) { item ->
                        ExpenseRow(
                            expense = item,
                            onDelete = { expenses.remove(item) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SpendingStatusCard(todayTotal: Double, dailyLimit: Double) {
    val isOverLimit = todayTotal > dailyLimit
    val percentage = (todayTotal / dailyLimit).coerceAtMost(1.0)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isOverLimit) Color(0xFFFFEBEE) else Color(0xFFE8F5E9)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Aaj ka kharcha",
                fontSize = 15sp,
                color = Color.DarkGray
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "₹ \${String.format(\"%.1f\", todayTotal)}",
                fontSize = 32sp,
                fontWeight = FontWeight.Black,
                color = if (isOverLimit) Color.Red else Color(0xFF2E7D32)
            )
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = percentage.toFloat(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = if (isOverLimit) Color.Red else Color(0xFF4CAF50),
                trackColor = Color(0xFFCECECE)
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Daily Limit: ₹ \${dailyLimit.toInt()} | \${if (isOverLimit) "Limit exceed ho gayi! ⚠️" else "Control mein hai! 👍"}",
                fontSize = 12sp,
                fontWeight = FontWeight.Medium,
                color = if (isOverLimit) Color.Red else Color.DarkGray
            )
        }
    }
}

@Composable
fun CategoryChip(
    category: ExpenseCategory,
    isSelected: Boolean,
    onSelected: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isSelected) category.color else MaterialTheme.colorScheme.surface
            )
            .clickable { onSelected() }
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(category.icon, fontSize = 20sp)
            Text(
                text = category.label,
                fontSize = 10sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) Color.Black else Color.Gray
            )
        }
    }
}

@Composable
fun ExpenseRow(expense: Expense, onDelete: () -> Unit) {
    val format = SimpleDateFormat("hh:mm a", Locale.getDefault())
    val dateStr = format.format(Date(expense.timestamp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Category Icon circle
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(expense.category.color.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(expense.category.icon, fontSize = 20sp)
                }
                
                Column {
                    Text(expense.description, fontWeight = FontWeight.SemiBold, fontSize = 15sp)
                    Text(
                        text = "\${expense.category.label} • \$dateStr", 
                        fontSize = 12sp, 
                        color = Color.Gray
                    )
                }
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "₹ \${expense.amount.toInt()}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16sp,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "❌",
                    modifier = Modifier
                        .clickable { onDelete() }
                        .padding(4.dp),
                    fontSize = 14sp
                )
            }
        }
    }
}

fun isToday(timestamp: Long): Boolean {
    val today = Calendar.getInstance()
    val check = Calendar.getInstance().apply { timeInMillis = timestamp }
    return today.get(Calendar.YEAR) == check.get(Calendar.YEAR) &&
           today.get(Calendar.DAY_OF_YEAR) == check.get(Calendar.DAY_OF_YEAR)
}
`
  },
  {
    fileName: "Theme.kt",
    filePath: "app/src/main/java/com/student/tracker/ui/theme/Theme.kt",
    language: "kotlin",
    description: "The visual style definition for Student Expense Tracker, defining Material 3 light and dark color schemes.",
    code: `package com.student.tracker.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF81C784),
    secondary = Color(0xFF64B5F6),
    tertiary = Color(0xFFFFB74D),
    background = Color(0xFF121212),
    surface = Color(0xFF1E1E1E),
    onPrimary = Color(0xFF1B5E20),
    onSecondary = Color(0xFF0D47A1),
    onBackground = Color(0xFFECEFF1),
    onSurface = Color(0xFFECEFF1)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF2E7D32),       // Indian Green emphasis
    secondary = Color(0xFF1976D2),     // Accent blue for study/travel
    tertiary = Color(0xFFE65100),      // Saffron hints
    background = Color(0xFFF9FBE7),    // Mild warm ivory background
    surface = Color(0xFFFFFFFF),
    onPrimary = Color(0xFFFFFFFF),
    onSecondary = Color(0xFFFFFFFF),
    onBackground = Color(0xFF1A1C18),
    onSurface = Color(0xFF1A1C18),
    primaryContainer = Color(0xFFC8E6C9),
    onPrimaryContainer = Color(0xFF002300)
)

@Composable
fun StudentExpenseTrackerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        DarkColorScheme
    } else {
        LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography, // standard default Material 3 typography
        content = content
    )
}
`
  },
  {
    fileName: "BuildGradle.kts",
    filePath: "app/build.gradle.kts",
    language: "kotlin",
    description: "The project build configuration specifying targets, Jetpack Compose versions, and Material 3 dependencies.",
    code: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.student.tracker"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.student.tracker"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.1"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2023.08.0"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2023.08.0"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
`
  }
];
