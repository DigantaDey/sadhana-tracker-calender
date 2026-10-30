# Room, DataStore and kotlinx.serialization all rely on reflection or generated
# code; Compose is already handled by its consumer rules.
-keep class app.sadhana.data.** { *; }
-keepattributes *Annotation*, InnerClasses, Signature
-dontwarn kotlinx.serialization.**
-keep,includedescriptorclasses class app.sadhana.**$$serializer { *; }

# The domain layer is pure Kotlin — nothing there needs keeping, but the
# pañcāṅga result types are read by Compose state holders, so keep their names.
-keepnames class app.sadhana.domain.** { public protected *; }

# Silence warnings from optional on-device inference classes that are not
# bundled in the default build.
-dontwarn com.google.mediapipe.**
