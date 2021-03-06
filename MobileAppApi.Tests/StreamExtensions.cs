// Copyright 2020 De Staat der Nederlanden, Ministerie van Volksgezondheid, Welzijn en Sport.
// Licensed under the EUROPEAN UNION PUBLIC LICENCE v. 1.2
// SPDX-License-Identifier: EUPL-1.2

using System.IO;

namespace MobileAppApi.Tests
{
    public static class StreamExtensions
    {
        public static byte[] ToArray(this Stream stream)
        {
            //if (stream is MemoryStream memStream)
            //{
            //    return memStream.ToArray();
            //}

            using var ms = new MemoryStream();
            stream.CopyTo(ms);
            return ms.ToArray();
        }
    }
}