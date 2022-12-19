package shared.util

import mu.KotlinLogging
import okhttp3.OkHttpClient
import okhttp3.Request
import shared.util.SerializationHelper.convertJsonStringToObject
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets


object HttpHelper {

    private val client = OkHttpClient()
    private val logger = KotlinLogging.logger { }

    inline fun <reified TypeOfObject> getResponseAsObject(request: Request) : TypeOfObject {
        val responseBody = getResponseBody(request)
        return convertJsonStringToObject(responseBody)
    }

    @Throws
    fun getResponseBody(request: Request) : String {
        logger.info { "Sending request $request" }
        val response = client.newCall(request).execute()

        if (!response.isSuccessful) {
            logger.error { "The request was not successful. The response message was: ${response.message}" }
            throw java.lang.RuntimeException()
        }

        try {
            logger.info { "Successfully received a response" }
            return response.body!!.string()
        } catch (exception: java.lang.NullPointerException) {
            logger.error { "The response body was null. The response message was: ${response.message}" }
            throw java.lang.NullPointerException("The response body was null")
        }
    }

    fun encodeValue(value: String): String {
        return URLEncoder.encode(value, StandardCharsets.UTF_8.toString())
    }

    fun decode(value: String): String {
        return URLDecoder.decode(value, StandardCharsets.UTF_8.toString())
    }
}