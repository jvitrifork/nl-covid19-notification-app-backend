﻿// Copyright © 2020 De Staat der Nederlanden, Ministerie van Volksgezondheid, Welzijn en Sport.
// Licensed under the EUROPEAN UNION PUBLIC LICENCE v. 1.2
// SPDX-License-Identifier: EUPL-1.2

using ProtoBuf;

namespace NL.Rijksoverheid.ExposureNotification.BackEnd.Components.ExposureKeySetsEngine.ContentFormatters
{
    [ProtoContract]
    public class ExposureKeySetSignaturesContent
    {
        [ProtoMember(1)]
        public ExposureKeySetSignatureContent[] Items { get; set; }
    }

}