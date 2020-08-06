﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using NL.Rijksoverheid.ExposureNotification.BackEnd.Components.Workflow.RegisterSecret;
using System;
using System.Linq;

namespace NL.Rijksoverheid.ExposureNotification.BackEnd.Components.WebApi
{
    /// <summary>
    /// NOTE: DO not apply this attribute directly, apply <see cref="ResponsePaddingFilterFactoryAttribute"/>
    /// When applied to a controller or action which returns an OkObjectResult or OkResult
    /// adds a random padding to the response as a header.
    /// It's not in the list of headers in the RFC or new headers on the IANA site:
    /// https://www.iana.org/assignments/message-headers/message-headers.xhtml
    /// </summary>
    public class ResponsePaddingFilterAttribute : ActionFilterAttribute
    {
        /// <summary>
        /// Custom header without the x-prefix as per https://tools.ietf.org/html/rfc6648.
        /// </summary>
        private const string PaddingHeader = "padding";

        /// <summary>
        /// Character used for padding, must be a 1-byte character
        /// </summary>
        private const string PaddingCharacter = "=";
        
        private readonly IResponsePaddingConfig _Config;
        private readonly IRandomNumberGenerator _Rng;
        private readonly ILogger _Logger;

        /// <summary>
        /// Default constructor
        /// </summary>
        public ResponsePaddingFilterAttribute(IResponsePaddingConfig config, IRandomNumberGenerator rng, ILogger<ResponsePaddingFilterAttribute> logger)
        {
            _Config = config ?? throw new ArgumentNullException(nameof(_Config));
            _Rng = rng ?? throw new ArgumentNullException(nameof(_Logger));
            _Logger = logger ?? throw new ArgumentNullException(nameof(_Rng));
        }

        /// <summary>
        /// Adds a random padding as an http header to the response.
        /// </summary>
        public override void OnResultExecuting(ResultExecutingContext context)
        {
            base.OnResultExecuting(context);
            
            string resultString = string.Empty;

            // Only works for object results
            if (context.Result is ObjectResult objectResult &&  objectResult.Value is string objectResultString)
            {
                resultString = objectResultString;
            }

            // Nothing needs doing if we're above the minimum length
            if (resultString.Length >= _Config.MinimumLengthInBytes)
            {
                _Logger.LogInformation("No padding needed as response length of {Length} is greater than the minimum of {MinimumLengthInBytes}..",
                    resultString.Length, _Config.MinimumLengthInBytes);

                return;
            }
            
            // Add padding here
            context.HttpContext.Response.Headers.Add(PaddingHeader, Padding(resultString.Length));

            _Logger.LogInformation("Added padding to the response.");
        }

        /// <summary>
        /// Adds padding equal 
        /// </summary>
        private string Padding(int contentLength)
        {
            var paddingLength = _Rng.Next(_Config.MinimumLengthInBytes, _Config.MaximumLengthInBytes) - contentLength;
            _Logger.LogInformation("Length of response padding: {PaddingLength}", paddingLength);

            var padding = string.Concat(Enumerable.Repeat(PaddingCharacter, paddingLength));
            _Logger.LogDebug("Response padding: {Padding}", padding);

            return padding;
        }
    }
}