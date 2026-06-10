Add-Type -AssemblyName System.Drawing
$img = new-object System.Drawing.Bitmap('public\sdc_seal.png')
$pixel = $img.GetPixel(0,0)
Write-Output ('#' + $pixel.R.ToString('X2') + $pixel.G.ToString('X2') + $pixel.B.ToString('X2'))
