NetworkGroupLookup.NetworkProductGroupLookup=class{lookup(request){return ProductRegistry.nameForUrl(request.parsedURL);}
lookupColumnValue(request){return this.lookup(request)||'';}
requestComparator(aRequest,bRequest){var aValue=this.lookupColumnValue(aRequest);var bValue=this.lookupColumnValue(bRequest);if(aValue===bValue)
return aRequest.indentityCompare(bRequest);return aValue>bValue?1:-1;}};;