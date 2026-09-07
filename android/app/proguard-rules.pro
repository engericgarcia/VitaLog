# kotlinx.serialization guarda os serializadores em campos estáticos gerados;
# sem esta regra o R8 os remove e a desserialização falha só no release.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class br.com.vitalog.triagem.data.** {
    *** Companion;
}
-keepclasseswithmembers class br.com.vitalog.triagem.data.** {
    kotlinx.serialization.KSerializer serializer(...);
}
