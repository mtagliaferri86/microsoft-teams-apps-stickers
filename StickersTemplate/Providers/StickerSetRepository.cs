//----------------------------------------------------------------------------------------------
// <copyright file="StickerSetRepository.cs" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>
//----------------------------------------------------------------------------------------------

namespace StickersTemplate.Providers
{
    using System;
    using System.Linq;
    using System.Net.Http;
    using System.Threading;
    using System.Threading.Tasks;
	using Microsoft.Extensions.Logging;
    using Newtonsoft.Json;
    using StickersTemplate.Interfaces;
    using StickersTemplate.Models;
    using StickersTemplate.Providers.Serialization;

    /// <summary>
    /// A concrete implementation of the <see cref="IStickerSetRepository"/> interface.
    /// </summary>
    public class StickerSetRepository : IStickerSetRepository
    {
        private static readonly StickerSet DefaultStickerSet = new StickerSet("default", new Sticker[0]);
        private static readonly string StickerSetName = "Stickers";
        private static StickerSet cachedStickerSet;
        private static DateTimeOffset stickerSetCachedAt = DateTimeOffset.MinValue;
        private static object lockObject = new object();
        private readonly ILogger logger;
        private readonly ISettings settings;
        private readonly IHttpClientFactory httpClientFactory;

		/// <summary>
		/// Initializes a new instance of the <see cref="StickerSetRepository"/> class.
		/// </summary>
		/// <param name="logger">The <see cref="ILogger"/>.</param>
		/// <param name="settings">The <see cref="ISettings"/>.</param>
		/// <param name="clientFactory">The <see cref="IHttpClientFactory"/>.</param>
		public StickerSetRepository(ILogger<StickerSetRepository> logger, ISettings settings, IHttpClientFactory clientFactory)
        {
            this.logger = logger ?? throw new ArgumentNullException(nameof(logger));
            this.settings = settings ?? throw new ArgumentNullException(nameof(settings));
            this.httpClientFactory = clientFactory ?? throw new ArgumentNullException(nameof(clientFactory));
        }

        /// <inheritdoc />
        public async Task<StickerSet> FetchStickerSetAsync(CancellationToken cancellationToken = default)
        {
            using (var scope = this.logger.BeginScope($"{nameof(StickerSetRepository)}.{nameof(this.FetchStickerSetAsync)}"))
            {
				lock (lockObject)
				{
                    if (cachedStickerSet != null && (DateTimeOffset.UtcNow - stickerSetCachedAt).TotalMinutes < this.settings.CachedStickerSetTTLMins)
                    {
                        this.logger.LogInformation("Returning cached StickerSet");
                        return cachedStickerSet;
                    }
                }
                
                var configUri = this.settings.ConfigUri;
                if (configUri == null)
                {
                    this.logger.LogInformation($"{nameof(this.settings.ConfigUri)} was not a valid absolute URI; default sticker set will be used.");
                    return DefaultStickerSet;
                }

                using (HttpClient httpClient = this.httpClientFactory.CreateClient())
				{
					var response = await httpClient.GetAsync(configUri);
					if (!response.IsSuccessStatusCode)
					{
						this.logger.LogError($"GET {configUri} returned {response.StatusCode}: {response.ReasonPhrase}; default sticker set will be used.");
						return DefaultStickerSet;
					}

					try
					{
						var responseContent = await response.Content.ReadAsStringAsync();
						var stickerConfig = JsonConvert.DeserializeObject<StickerConfigDTO>(responseContent);
						var stickers = stickerConfig?.Images?.Select(image => new Sticker(image.Name, new Uri(image.ImageUri), image.Keywords)).ToArray();

                        lock (lockObject)
                        {
                            cachedStickerSet = new StickerSet(StickerSetName, stickers);
                            stickerSetCachedAt = DateTimeOffset.UtcNow;
                        }

                        return cachedStickerSet;
					}
					catch (JsonException e)
					{
						this.logger.LogError(e, $"Response from GET {configUri} could not be parsed properly; default sticker set will be used.");
						return DefaultStickerSet;
					} 
				}
            }
        }
    }
}
