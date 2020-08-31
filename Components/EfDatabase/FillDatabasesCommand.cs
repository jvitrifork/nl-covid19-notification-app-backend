// Copyright 2020 De Staat der Nederlanden, Ministerie van Volksgezondheid, Welzijn en Sport.
// Licensed under the EUROPEAN UNION PUBLIC LICENCE v. 1.2
// SPDX-License-Identifier: EUPL-1.2

using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using NL.Rijksoverheid.ExposureNotification.BackEnd.Components.DevOps;
using NL.Rijksoverheid.ExposureNotification.BackEnd.Components.EfDatabase.Configuration;

namespace NL.Rijksoverheid.ExposureNotification.BackEnd.Components.EfDatabase
{
    public class FillDatabasesCommand
    {
        private readonly WorkflowDatabaseCreateCommand _Workflow;
        private readonly ContentDatabaseCreateCommand _Content;
        private readonly ILogger _Logger;

        private readonly WriteFromFile _WriteFromFile;

        public FillDatabasesCommand(WorkflowDatabaseCreateCommand workflow, ContentDatabaseCreateCommand content, ILogger<FillDatabasesCommand> logger, WriteFromFile writeFromFile)
        {
            _Workflow = workflow ?? throw new ArgumentNullException(nameof(workflow));
            _Content = content ?? throw new ArgumentNullException(nameof(content));
            _Logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _WriteFromFile = writeFromFile;
        }

        public async Task Execute(string[] args)
        {
            if (args.Length == 0)
            {
                _Logger.LogInformation("Start.");

                _Logger.LogInformation("Workflow...");
                await _Workflow.AddExampleContent();

                _Logger.LogInformation("Content...");
                await _Content.AddExampleContent();

                _Logger.LogInformation("Complete.");

                return;
            }

            await _WriteFromFile.Execute(args);
        }
    }
}
