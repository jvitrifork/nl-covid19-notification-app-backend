// Copyright 2020 De Staat der Nederlanden, Ministerie van Volksgezondheid, Welzijn en Sport.
// Licensed under the EUROPEAN UNION PUBLIC LICENCE v. 1.2
// SPDX-License-Identifier: EUPL-1.2

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NL.Rijksoverheid.ExposureNotification.BackEnd.Components.Icc.Models;
using TheIdentityHub.AspNetCore.Authentication;

namespace NL.Rijksoverheid.ExposureNotification.BackEnd.Components.Icc
{
    public class TheIdentityHubService : ITheIdentityHubService
    {
        private readonly TheIdentityHubOptions _Options;
        private readonly ILogger<TheIdentityHubService> _Logger;

        public TheIdentityHubService(IOptionsMonitor<TheIdentityHubOptions> options,
            ILogger<TheIdentityHubService> logger)
        {
            _Options = options.Get(TheIdentityHubDefaults.AuthenticationScheme) ??
                       throw new ArgumentNullException(nameof(options));
            _Logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<bool> VerifyToken(string accessToken)
        {
            if (accessToken == null) throw new ArgumentNullException(nameof(accessToken));
            var requestUri = new Uri(_Options.TheIdentityHubUrl, _Options.VerifyTokenEndpoint);
            HttpResponseMessage response = await _Options.Backchannel.SendAsync(
                new HttpRequestMessage(HttpMethod.Get, requestUri)
                {
                    Headers =
                    {
                        Accept =
                        {
                            new MediaTypeWithQualityHeaderValue("application/json")
                        },
                        Authorization = new AuthenticationHeaderValue("Bearer", accessToken)
                    }
                }).ConfigureAwait(false);

            if (response == null) return false;
            var responseString = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                _Logger.LogWarning("{RequestUri}: Failed HTTP: {ResponseStatusCode} - {ResponseString}", requestUri,
                    response.StatusCode, responseString);
                return false;
            }

            if (String.IsNullOrEmpty(responseString))
            {
                _Logger.LogWarning("{RequestUri}: Failed ResponseString is empty: {ResponseStatusCode} - {ResponseString}", requestUri,
                    response.StatusCode, responseString);
                return false;
            }

            var responseObject = JsonSerializer.Deserialize<Dictionary<string, object>>(responseString);

            if (responseObject.ContainsKey("error") && responseObject["error"] != null)
            {
                _Logger.LogWarning("{RequestUri}: Failed HTTP: {ResponseStatusCode} - {ResponseString}", requestUri,
                    response.StatusCode, responseString);
                return false;
            }

            _Logger.LogInformation("Positive token verify result {ResponseString}", responseString);
            return responseObject.ContainsKey("audience") && responseObject["audience"] != null;
        }

        public async Task<bool> RevokeAccessToken(string accessToken)
        {
            if (accessToken == null) throw new ArgumentNullException(nameof(accessToken));
            var requestUri = new Uri(_Options.TheIdentityHubUrl, _Options.Tenant + "/oauth2/v1/revoke");

            var payload = new List<KeyValuePair<string, string>>();
            payload.Add(new KeyValuePair<string, string>("client_id", _Options.ClientId));
            payload.Add(new KeyValuePair<string, string>("token", accessToken));
            payload.Add(new KeyValuePair<string, string>("token_type_hint", "access_token"));

            HttpResponseMessage response = await _Options.Backchannel.SendAsync(
                new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new FormUrlEncodedContent(payload),
                    Headers =
                    {
                        Accept =
                        {
                            new MediaTypeWithQualityHeaderValue("application/json")
                        },
                        Authorization = new AuthenticationHeaderValue("Bearer", accessToken)
                    }
                }).ConfigureAwait(false);

            if (response.IsSuccessStatusCode)
            {
                _Logger.LogInformation("Access Token successfully revoked");
                return true;
            }

            _Logger.LogWarning("Access Token not revoked, statuscode {ResponseStatusCode}",response.StatusCode.ToString());
            return false;
        }

        public async Task<bool> VerifyClaimToken(IEnumerable<Claim> userClaims)
        {
            var accessToken = userClaims.FirstOrDefault(c => c.Type == TheIdentityHubClaimTypes.AccessToken)?.Value;
            if (accessToken != null)
            {
                return await VerifyToken(accessToken);
            }

            return false;
        }
    }
}