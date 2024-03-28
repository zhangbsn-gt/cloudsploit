var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'OpenSearch Enable Audit Logs',
    category: 'OpenSearch',
    domain: 'Databases',
    severity: 'Medium',
    description: 'Ensures the Audit Logs feature is enabled for all the Amazon OpenSearch domains.',
    more_info: 'The Audit Logs feature allows you to log all user activity on your Amazon OpenSearch domains (clusters), including failed login attempts, and which users accessed certain indices, documents, or fields. ',
    link: 'https://docs.aws.amazon.com/opensearch-service/latest/developerguide/audit-logs.html',
    recommended_action: 'Modify Opensearch domain and enable audit logs.',
    apis: ['OpenSearch:listDomainNames', 'OpenSearch:describeDomain'],
    realtime_triggers: ['opensearch:CreateDomain', 'opensearch:UpdateDomainConfig', 'opensearch:DeleteDomain'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings);

        async.each(regions.es, function(region, rcb) {
            var listDomainNames = helpers.addSource(cache, source,
                ['opensearch', 'listDomainNames', region]);

            if (!listDomainNames) return rcb();

            if (listDomainNames.err || !listDomainNames.data) {
                helpers.addResult(
                    results, 3,
                    'Unable to query for OpenSearch domains: ' + helpers.addError(listDomainNames), region);
                return rcb();
            }

            if (!listDomainNames.data.length){
                helpers.addResult(results, 0, 'No OpenSearch domains found', region);
                return rcb();
            }

            listDomainNames.data.forEach(function(domain){
            const resource = `arn:${awsOrGov}:es:${region}:${accountId}:domain/${domain.DomainName}`;
                var describeDomain = helpers.addSource(cache, source,
                    ['opensearch', 'describeDomain', region, domain.DomainName]);

                if (!describeDomain ||
                    describeDomain.err ||
                    !describeDomain.data ||
                    !describeDomain.data.DomainStatus) {
                    helpers.addResult(
                        results, 3,
                        'Unable to query for OpenSearch domain config: ' + helpers.addError(describeDomain), region);
                } else {
                    if (describeDomain.data &&
                        describeDomain.data.DomainStatus &&
                        describeDomain.data.DomainStatus.LogPublishingOptions &&
                        describeDomain.data.DomainStatus.LogPublishingOptions.AUDIT_LOGS &&
                        describeDomain.data.DomainStatus.LogPublishingOptions.AUDIT_LOGS.Enabled) {
                        helpers.addResult(results, 0,
                            'Audit Logs feature is enabled for OpenSearch domain', region, domain.DomainName);
                    } else {
                        helpers.addResult(results, 2,
                            'Audit Logs feature is not enabled for OpenSearch domain', region, resource);
                    }
                }
            });

            rcb();
        }, function() {
            callback(null, results, source);
        });
    }
};
