param(
    [ValidateSet('create','status','stop','start','delete')][string]$Action = 'status',
    [string]$Region = 'us-east-1'
)
$ErrorActionPreference = 'Stop'
$statePath = Join-Path $PSScriptRoot 'aws-state.json'
$keyPath = Join-Path $PSScriptRoot 'twitchnt-key.pem'
function AwsJson {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    $result = & aws @Arguments --region $Region --output json --no-cli-pager
    if ($LASTEXITCODE -ne 0) { throw "AWS falló: $($Arguments[0..1] -join ' ')" }
    if ($result) { ($result -join "`n") | ConvertFrom-Json }
}
function SaveState { $script:state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding utf8 }
if ($Action -eq 'create') {
    if (Test-Path -LiteralPath $statePath) { throw 'Existe aws-state.json; revisa status antes de crear recursos.' }
    $identity = AwsJson sts get-caller-identity
    $budgets = AwsJson budgets describe-budgets --account-id $identity.Account
    if (!$budgets.Budgets.Count) { throw 'Configura un presupuesto AWS antes de crear la instancia.' }
    $vpc = (AwsJson ec2 describe-vpcs --filters 'Name=is-default,Values=true').Vpcs | Select-Object -First 1
    if (!$vpc) { throw 'No existe VPC predeterminada.' }
    $name = 'twitchnt-' + (Get-Date -Format 'yyyyMMddHHmmss')
    $script:state = @{ Region=$Region; KeyName=$name; GroupId=$null; InstanceId=$null; IP=$null; VolumeId=$null }
    SaveState
    $key = AwsJson ec2 create-key-pair --key-name $name --key-type ed25519
    [IO.File]::WriteAllText($keyPath, $key.KeyMaterial + "`n", [Text.UTF8Encoding]::new($false))
    & icacls $keyPath /inheritance:r /grant:r "$($env:USERNAME):(R)" | Out-Null
    $state.GroupId = (AwsJson ec2 create-security-group --group-name $name --description 'Twitchnt manual EC2' --vpc-id $vpc.VpcId).GroupId
    SaveState
    $ip = (Invoke-RestMethod 'https://checkip.amazonaws.com').Trim()
    AwsJson ec2 authorize-security-group-ingress --group-id $state.GroupId --protocol tcp --port 22 --cidr "$ip/32" | Out-Null
    foreach ($port in 80,1935) { AwsJson ec2 authorize-security-group-ingress --group-id $state.GroupId --protocol tcp --port $port --cidr '0.0.0.0/0' | Out-Null }
    $ami = (AwsJson ssm get-parameter --name '/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id').Parameter.Value
    $diskPath = Join-Path $PSScriptRoot 'disk.json'
    '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":10,"VolumeType":"gp3","Encrypted":true,"DeleteOnTermination":true}}]' | Set-Content -LiteralPath $diskPath -Encoding ascii
    try {
        $instance = (AwsJson ec2 run-instances --image-id $ami --instance-type t3.micro --key-name $name --security-group-ids $state.GroupId --associate-public-ip-address --metadata-options 'HttpTokens=required,HttpPutResponseHopLimit=2' --credit-specification 'CpuCredits=standard' --block-device-mappings "file://$diskPath" --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Twitchnt-Manual}]').Instances[0]
        $state.InstanceId = $instance.InstanceId
        $state.VolumeId = $instance.BlockDeviceMappings[0].Ebs.VolumeId
        SaveState
    } finally { Remove-Item -LiteralPath $diskPath }
} else {
    if (!(Test-Path -LiteralPath $statePath)) { throw 'No hay estado AWS guardado.' }
    $script:state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $Region = $state.Region
    if ($Action -eq 'stop') { AwsJson ec2 stop-instances --instance-ids $state.InstanceId | Out-Null }
    if ($Action -eq 'start') { AwsJson ec2 start-instances --instance-ids $state.InstanceId | Out-Null }
    if ($Action -eq 'delete') {
        if ($state.InstanceId) {
            AwsJson ec2 terminate-instances --instance-ids $state.InstanceId | Out-Null
            & aws ec2 wait instance-terminated --instance-ids $state.InstanceId --region $Region
            if ($LASTEXITCODE -ne 0) { throw 'No se pudo confirmar la terminación.' }
        }
        if ($state.GroupId) { AwsJson ec2 delete-security-group --group-id $state.GroupId | Out-Null }
        AwsJson ec2 delete-key-pair --key-name $state.KeyName | Out-Null
        Remove-Item -LiteralPath $keyPath -ErrorAction SilentlyContinue
        Write-Output 'Instancia terminada, grupo y llave eliminados. Estado conservado como evidencia local.'
        exit
    }
}
if ($state.InstanceId) {
    $instance = (AwsJson ec2 describe-instances --instance-ids $state.InstanceId).Reservations[0].Instances[0]
    $state.IP = $instance.PublicIpAddress
    SaveState
    [pscustomobject]@{ InstanceId=$state.InstanceId; State=$instance.State.Name; IP=$state.IP; Region=$Region }
}
