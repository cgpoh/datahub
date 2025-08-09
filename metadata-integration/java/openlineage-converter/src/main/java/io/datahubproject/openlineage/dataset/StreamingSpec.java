package io.datahubproject.openlineage.dataset;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.Optional;


@Builder
@Getter
@Setter
@ToString
public class StreamingSpec {
  final String alias;
  final String platform;
  final String streamingIoPlatformType;
  @Builder.Default
  final Optional<String> env = Optional.empty();
  @Builder.Default
  final Optional<String> platformInstance = Optional.empty();
  @Builder.Default
  final Boolean usePlatformInstance = false;
}
