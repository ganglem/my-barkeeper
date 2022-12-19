package shared.util

import mu.KotlinLogging
import okhttp3.Request
import shared.util.HttpHelper.getResponseAsObject
import java.io.File
import java.nio.file.Path

object Printer {

    private val outputFolder: Path = File("program_output").toPath()
    val logger = KotlinLogging.logger { }

    inline fun <reified TypeOfResponse> writeResponseToTextFile(fileName: String, request: Request) : TypeOfResponse{
        val response = getResponseAsObject<TypeOfResponse>(request)
        writeObjectToTextFile(fileName, response)
        return response
    }

    inline fun <reified TypeOfObject> writeObjectToTextFile(fileName: String, obj: TypeOfObject) {
        logger.info { "Printing Object of type ${obj!!::class.simpleName}" }
        writeTextToFile("json/$fileName", SerializationHelper.convertObjectToJsonString(obj))
    }

    fun writeTextToFile(fileName: String, content: String) {
        val targetPath = outputFolder.resolve(fileName)
        logger.info { "Printing to $targetPath" }
        targetPath.toFile().writeText(content)
    }
}