using Microsoft.Azure.Functions.Extensions.DependencyInjection;
using Microsoft.Bot.Connector.Authentication;
using Microsoft.Extensions.DependencyInjection;
using StickersTemplate.Config;
using StickersTemplate.Interfaces;
using StickersTemplate.Providers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

[assembly: FunctionsStartup(typeof(StickersTemplate.Startup))]
namespace StickersTemplate
{
    public class Startup : FunctionsStartup
    {
        public override void Configure(IFunctionsHostBuilder builder)
        {
            builder.Services.AddHttpClient();
            builder.Services.AddSingleton<ISettings, Settings>();
            builder.Services.AddSingleton<IStickerSetRepository, StickerSetRepository>();
            builder.Services.AddTransient<IStickerSetIndexer, StickerSetIndexer>();
            builder.Services.AddSingleton<ICredentialProvider>(sp =>
            {
                ISettings settings = sp.GetRequiredService<ISettings>();
                return new SimpleCredentialProvider(settings.MicrosoftAppId, null);
            });
            builder.Services.AddSingleton<IChannelProvider>(sp => new SimpleChannelProvider());
        }
    }
}
