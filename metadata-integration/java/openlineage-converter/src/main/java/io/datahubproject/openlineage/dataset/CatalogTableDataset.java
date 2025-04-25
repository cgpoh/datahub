package io.datahubproject.openlineage.dataset;

import com.linkedin.common.FabricType;
import io.datahubproject.openlineage.config.DatahubOpenlineageConfig;
import lombok.ToString;
import lombok.extern.slf4j.Slf4j;


@ToString
@Slf4j
public class CatalogTableDataset extends SparkDataset {
  public CatalogTableDataset(String dsName, String platformInstance, String platform, FabricType fabricType) {
    super(platform, platformInstance, dsName, fabricType);
  }

  private static String getDatasetName(String platformInstance, String description, String streamingIoPlatformType,
      String streamingIoType) throws IllegalArgumentException {
    int dotIndex = description.indexOf('.');
    String platformName = dotIndex != -1 ? description.substring(0, dotIndex) : null;

    if ((platformName != null && platformName.equals(platformInstance)) && (streamingIoPlatformType != null
        && streamingIoPlatformType.equalsIgnoreCase(streamingIoType))) {
      return platformInstance + description.substring(dotIndex);
    }
    return null;
  }

  public static CatalogTableDataset create(String streamingPlatform, String description,
      DatahubOpenlineageConfig datahubConf, String streamingIoType) throws InstantiationException {
    if (datahubConf.getStreamingSpecs() == null) {
      log.info("No streaming_specs configuration found for platform {}.", streamingPlatform);
    } else {
      // Filter out path specs that don't match the platform
      for (StreamingSpec streamingSpec : datahubConf.getStreamingSpecsForPlatform(streamingPlatform)) {
        log.info("Checking match for streaming_alias: " + streamingSpec.getAlias());

        String platformInstance = streamingSpec.platformInstance.orElse(null);
        if (platformInstance != null) {
          FabricType fabricType = datahubConf.getFabricType();

          if (streamingSpec.getEnv().isPresent()) {
            try {
              fabricType = FabricType.valueOf(streamingSpec.getEnv().get());
            } catch (IllegalArgumentException e) {
              log.warn("Invalid FabricType: {}", streamingSpec.getEnv().get());
            } catch (NullPointerException e) {
              log.warn("Env string is null");
            }
          }
          String streamingIoPlatformType = streamingSpec.getStreamingIoPlatformType();
          String datasetName = getDatasetName(platformInstance, description, streamingIoPlatformType, streamingIoType);
          if (datasetName != null) {
            return new CatalogTableDataset(
                getDatasetName(platformInstance, description, streamingIoPlatformType, streamingIoType), null,
                streamingPlatform, fabricType);
          }
        }
      }
    }
    return null;
  }
}
